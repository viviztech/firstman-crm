import { randomUUID } from "node:crypto";
import { eq, ilike } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { services } from "@/db/schema/catalog";
import { clients } from "@/db/schema/clients";
import { invoices, payments } from "@/db/schema/invoices";
import { leads } from "@/db/schema/leads";
import { orders, orderTasks } from "@/db/schema/orders";
import { createInvoice } from "@/services/invoices";
import { createLead } from "@/services/leads";
import { createOrder } from "@/services/orders";
import { globalSearch } from "@/services/search";

const MARKER = `SearchMarker${randomUUID().slice(0, 8)}`;

describe("search service (integration)", () => {
  const managerId = randomUUID();
  const execAId = randomUUID();
  const execBId = randomUUID();
  const accountantId = randomUUID();

  const managerScope = { userId: managerId, role: "manager" as const };
  const execAScope = { userId: execAId, role: "executive" as const };
  const execBScope = { userId: execBId, role: "executive" as const };
  const accountantScope = { userId: accountantId, role: "accountant" as const };

  let clientId: string;

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: managerId,
        name: "Search Test Manager",
        email: `search-manager-${managerId}@test.local`,
        emailVerified: true,
        role: "manager",
      },
      {
        id: execAId,
        name: "Search Test Exec A",
        email: `search-execA-${execAId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: execBId,
        name: "Search Test Exec B",
        email: `search-execB-${execBId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: accountantId,
        name: "Search Test Accountant",
        email: `search-accountant-${accountantId}@test.local`,
        emailVerified: true,
        role: "accountant",
      },
    ]);

    await createLead(
      {
        name: `${MARKER} Lead`,
        phone: "+919876615001",
        source: "website",
        assignedTo: execAId,
      },
      managerScope,
    );

    const [client] = await db
      .insert(clients)
      .values({
        type: "individual",
        name: `${MARKER} Client`,
        phone: "+919876615002",
        assignedTo: execAId,
        createdBy: managerId,
      })
      .returning();
    if (!client) throw new Error("Failed to create test client");
    clientId = client.id;

    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration service not found");

    await createOrder(
      { clientId, serviceId: service.id, quotedPricePaise: 100000, assignedTo: execAId },
      managerScope,
    );

    const invoice = await createInvoice(
      {
        clientId,
        lineItems: [{ description: "search-test-marker", qty: 1, ratePaise: 100000 }],
        gstRate: 0,
        dueDate: new Date("2026-12-31T00:00:00.000Z"),
      },
      managerScope,
    );
    if (!invoice) throw new Error("Failed to create test invoice");
  });

  afterAll(async () => {
    const testOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.clientId, clientId));
    for (const o of testOrders) {
      await db.delete(orderTasks).where(eq(orderTasks.orderId, o.id));
    }
    await db.delete(orders).where(eq(orders.clientId, clientId));

    const testInvoices = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.clientId, clientId));
    for (const inv of testInvoices) {
      await db.delete(payments).where(eq(payments.invoiceId, inv.id));
    }
    await db.delete(invoices).where(eq(invoices.clientId, clientId));

    await db.delete(clients).where(eq(clients.id, clientId));
    await db.delete(leads).where(ilike(leads.phone, "+919876615%"));
    await db.delete(user).where(eq(user.id, managerId));
    await db.delete(user).where(eq(user.id, execAId));
    await db.delete(user).where(eq(user.id, execBId));
    await db.delete(user).where(eq(user.id, accountantId));
  });

  it("returns matching leads, clients, orders, and invoices for a manager", async () => {
    const results = await globalSearch(managerScope, MARKER);
    expect(results.leads).toHaveLength(1);
    expect(results.leads[0]?.label).toBe(`${MARKER} Lead`);
    expect(results.leads[0]?.href).toBe(`/leads/${results.leads[0]?.id}`);

    expect(results.clients).toHaveLength(1);
    expect(results.clients[0]?.label).toBe(`${MARKER} Client`);

    expect(results.orders).toHaveLength(1);
    expect(results.orders[0]?.sublabel).toBe(`${MARKER} Client`);

    expect(results.invoices).toHaveLength(1);
    expect(results.invoices[0]?.sublabel).toBe(`${MARKER} Client`);
  });

  it("scopes leads/clients/orders to the executive's own assigned records", async () => {
    const ownResults = await globalSearch(execAScope, MARKER);
    expect(ownResults.leads).toHaveLength(1);
    expect(ownResults.clients).toHaveLength(1);
    expect(ownResults.orders).toHaveLength(1);

    const otherResults = await globalSearch(execBScope, MARKER);
    expect(otherResults.leads).toHaveLength(0);
    expect(otherResults.clients).toHaveLength(0);
    expect(otherResults.orders).toHaveLength(0);
  });

  it("blocks invoices entirely for executives", async () => {
    const results = await globalSearch(execAScope, MARKER);
    expect(results.invoices).toHaveLength(0);
  });

  it("blocks leads entirely for accountants but allows clients, orders, invoices", async () => {
    const results = await globalSearch(accountantScope, MARKER);
    expect(results.leads).toHaveLength(0);
    expect(results.clients).toHaveLength(1);
    expect(results.orders).toHaveLength(1);
    expect(results.invoices).toHaveLength(1);
  });

  it("returns empty results for queries shorter than 2 characters", async () => {
    const results = await globalSearch(managerScope, "a");
    expect(results).toEqual({ leads: [], clients: [], orders: [], invoices: [] });
  });
});
