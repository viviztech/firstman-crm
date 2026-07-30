import { randomUUID } from "node:crypto";
import { and, eq, ilike } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { services } from "@/db/schema/catalog";
import { clients } from "@/db/schema/clients";
import { documents } from "@/db/schema/documents";
import { messageLogs } from "@/db/schema/message-logs";
import { orders } from "@/db/schema/orders";
import { runDocsPendingReminderJob } from "@/jobs/docs-pending-cron";
import { createOrder } from "@/services/orders";

describe("runDocsPendingReminderJob (integration)", () => {
  const managerId = randomUUID();
  const managerScope = { userId: managerId, role: "manager" as const };
  let pvtLtdServiceId: string;

  beforeAll(async () => {
    await db.insert(user).values({
      id: managerId,
      name: "Docs Pending Test Manager",
      email: `docs-pending-manager-${managerId}@test.local`,
      emailVerified: true,
      role: "manager",
    });

    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration service not found");
    pvtLtdServiceId = service.id;
  });

  afterAll(async () => {
    const testOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .innerJoin(clients, eq(orders.clientId, clients.id))
      .where(ilike(clients.phone, "+919876613%"));
    const orderIds = testOrders.map((o) => o.id);
    for (const id of orderIds) {
      await db
        .delete(documents)
        .where(and(eq(documents.ownerType, "order"), eq(documents.ownerId, id)));
      await db.delete(messageLogs).where(eq(messageLogs.entityId, id));
      await db.delete(orders).where(eq(orders.id, id));
    }
    await db.delete(clients).where(ilike(clients.phone, "+919876613%"));
    await db.delete(user).where(eq(user.id, managerId));
  });

  it("reminds clients with pending docs on an open order, and logs the sends", async () => {
    const [client] = await db
      .insert(clients)
      .values({
        type: "individual",
        name: "Docs Pending Test Client",
        phone: "+919876613001",
        email: "docs-pending-client@example.com",
        createdBy: managerId,
      })
      .returning();
    if (!client) throw new Error("setup failed");

    const order = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        notes: "docs-pending-cron-test",
      },
      managerScope,
    );

    await runDocsPendingReminderJob();

    const rows = await db.query.messageLogs.findMany({
      where: eq(messageLogs.entityId, order.id),
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((row) => row.template === "docs_pending_reminder")).toBe(true);
  });

  it("does not remind for an order once all its documents are verified", async () => {
    const [client] = await db
      .insert(clients)
      .values({
        type: "individual",
        name: "Docs Pending Test Client 2",
        phone: "+919876613002",
        email: "docs-pending-client-2@example.com",
        createdBy: managerId,
      })
      .returning();
    if (!client) throw new Error("setup failed");

    const order = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        notes: "docs-pending-cron-test-verified",
      },
      managerScope,
    );
    await db
      .update(documents)
      .set({ status: "verified" })
      .where(and(eq(documents.ownerType, "order"), eq(documents.ownerId, order.id)));

    await runDocsPendingReminderJob();

    const rows = await db.query.messageLogs.findMany({
      where: eq(messageLogs.entityId, order.id),
    });
    expect(rows).toHaveLength(0);
  });
});
