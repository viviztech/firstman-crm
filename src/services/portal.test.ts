import { randomUUID } from "node:crypto";
import { eq, ilike } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { services } from "@/db/schema/catalog";
import { clients } from "@/db/schema/clients";
import { documents } from "@/db/schema/documents";
import { orders, orderTasks } from "@/db/schema/orders";
import { makeScope } from "@/lib/test-scope";
import { createOrder } from "@/services/orders";
import {
  getDocumentForPortalClient,
  listDocumentsForPortalClient,
  listOrdersForPortalClient,
} from "@/services/portal";

describe("portal service — cross-tenant isolation (integration)", () => {
  const managerId = randomUUID();
  const managerScope = makeScope(managerId, "manager");
  let pvtLtdServiceId: string;

  beforeAll(async () => {
    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration service not found");
    pvtLtdServiceId = service.id;

    await db.insert(user).values({
      id: managerId,
      name: "Portal Test Manager",
      email: `portal-manager-${managerId}@test.local`,
      emailVerified: true,
      role: "manager",
    });
  });

  afterAll(async () => {
    const testOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(ilike(orders.notes, "portal-test-marker%"));
    for (const order of testOrders) {
      await db.delete(orderTasks).where(eq(orderTasks.orderId, order.id));
      await db.delete(documents).where(eq(documents.ownerId, order.id));
    }
    await db.delete(orders).where(ilike(orders.notes, "portal-test-marker%"));
    await db.delete(clients).where(ilike(clients.phone, "+919876660%"));
    await db.delete(user).where(eq(user.id, managerId));
  });

  it("only returns orders and documents belonging to the requested client", async () => {
    const [clientA] = await db
      .insert(clients)
      .values({
        type: "individual",
        name: "Portal Client A",
        phone: `+919876660${randomUUID().slice(0, 6)}`,
        createdBy: managerId,
      })
      .returning();
    const [clientB] = await db
      .insert(clients)
      .values({
        type: "individual",
        name: "Portal Client B",
        phone: `+919876660${randomUUID().slice(0, 6)}`,
        createdBy: managerId,
      })
      .returning();
    if (!clientA || !clientB) throw new Error("failed to create fixture clients");

    const orderA = await createOrder(
      {
        clientId: clientA.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        notes: "portal-test-marker order A",
      },
      managerScope,
    );
    const orderB = await createOrder(
      {
        clientId: clientB.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        notes: "portal-test-marker order B",
      },
      managerScope,
    );

    const ordersForA = await listOrdersForPortalClient(clientA.id);
    expect(ordersForA.map((o) => o.id)).toEqual([orderA.id]);

    const [documentOfB] = await db.query.documents.findMany({
      where: eq(documents.ownerId, orderB.id),
      limit: 1,
    });
    if (!documentOfB) throw new Error("expected createOrder to generate a document checklist");

    const documentsForA = await listDocumentsForPortalClient(clientA.id);
    expect(documentsForA.some((d) => d.id === documentOfB.id)).toBe(false);

    expect(await getDocumentForPortalClient(documentOfB.id, clientA.id)).toBeNull();
    expect((await getDocumentForPortalClient(documentOfB.id, clientB.id))?.id).toBe(documentOfB.id);
  });
});
