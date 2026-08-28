import { randomUUID } from "node:crypto";
import { and, eq, ilike, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { services } from "@/db/schema/catalog";
import { clients } from "@/db/schema/clients";
import { invoices } from "@/db/schema/invoices";
import { messageLogs } from "@/db/schema/message-logs";
import { orders, orderTasks } from "@/db/schema/orders";
import { processSaleProformaIssuedJob } from "@/jobs/sale-proforma-notifications";
import { makeScope } from "@/lib/test-scope";
import { createProformaInvoiceInTx } from "@/services/invoices";
import { createOrder } from "@/services/orders";

// WHATSAPP_TOKEN is empty in the test .env, so WhatsApp sends here exercise the log driver
// deterministically (see notify.test.ts).

describe("sale-proforma-notifications (integration)", () => {
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
      name: "Sale Proforma Test Manager",
      email: `sale-proforma-manager-${managerId}@test.local`,
      emailVerified: true,
      role: "manager",
    });
  });

  afterAll(async () => {
    const testOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(ilike(orders.notes, "sale-proforma-test-marker%"));
    const orderIds = testOrders.map((o) => o.id);
    for (const id of orderIds) {
      await db.delete(orderTasks).where(eq(orderTasks.orderId, id));
    }

    const testClients = await db
      .select({ id: clients.id })
      .from(clients)
      .where(ilike(clients.phone, "+919876630%"));
    const clientIds = testClients.map((c) => c.id);
    if (clientIds.length > 0) {
      await db.delete(messageLogs).where(inArray(messageLogs.entityId, clientIds));
      const testInvoices = await db
        .select({ id: invoices.id })
        .from(invoices)
        .where(inArray(invoices.clientId, clientIds));
      const invoiceIds = testInvoices.map((i) => i.id);
      if (invoiceIds.length > 0) {
        await db.delete(messageLogs).where(inArray(messageLogs.entityId, invoiceIds));
        await db.delete(invoices).where(inArray(invoices.id, invoiceIds));
      }
    }
    await db.delete(orders).where(ilike(orders.notes, "sale-proforma-test-marker%"));
    await db.delete(clients).where(ilike(clients.phone, "+919876630%"));
    await db.delete(user).where(eq(user.id, managerId));
  });

  it("logs one whatsapp document send per proforma and exactly one combined email for the sale", async () => {
    const phone = `+919876630${randomUUID().slice(0, 6)}`;
    const email = `sale-proforma-${randomUUID()}@example.com`;
    const [client] = await db
      .insert(clients)
      .values({
        type: "individual",
        name: "Sale Proforma Client",
        phone,
        email,
        createdBy: managerId,
      })
      .returning();
    if (!client) throw new Error("failed to create test client");

    const orderA = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        notes: "sale-proforma-test-marker order A",
      },
      managerScope,
    );
    const orderB = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 200000,
        notes: "sale-proforma-test-marker order B",
      },
      managerScope,
    );

    const proformaA = await db.transaction((tx) =>
      createProformaInvoiceInTx(
        tx,
        {
          clientId: client.id,
          orderId: orderA.id,
          lineItems: [{ description: "Pvt Ltd Registration", qty: 1, ratePaise: 100000 }],
          gstRate: 18,
        },
        managerScope,
      ),
    );
    const proformaB = await db.transaction((tx) =>
      createProformaInvoiceInTx(
        tx,
        {
          clientId: client.id,
          orderId: orderB.id,
          lineItems: [{ description: "Pvt Ltd Registration", qty: 1, ratePaise: 200000 }],
          gstRate: 18,
        },
        managerScope,
      ),
    );

    await processSaleProformaIssuedJob({
      clientId: client.id,
      proformaInvoiceIds: [proformaA.id, proformaB.id],
    });

    const whatsappRows = await db.query.messageLogs.findMany({
      where: and(
        inArray(messageLogs.entityId, [proformaA.id, proformaB.id]),
        eq(messageLogs.channel, "whatsapp"),
      ),
    });
    expect(whatsappRows).toHaveLength(2);
    for (const row of whatsappRows) {
      expect(row.status).toBe("sent");
    }

    const emailRows = await db.query.messageLogs.findMany({
      where: and(eq(messageLogs.entityId, client.id), eq(messageLogs.channel, "email")),
    });
    expect(emailRows).toHaveLength(1);
    expect(emailRows[0]?.to).toBe(email);
    const payload = emailRows[0]?.payload as { lines: string[] } | null;
    expect(payload?.lines).toHaveLength(2);
  });
});
