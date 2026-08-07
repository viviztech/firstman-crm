import { randomUUID } from "node:crypto";
import { eq, ilike, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { clients } from "@/db/schema/clients";
import { invoices } from "@/db/schema/invoices";
import { makeScope } from "@/lib/test-scope";
import { renderInvoicePdf } from "@/services/invoice-pdf";
import { createInvoice } from "@/services/invoices";

describe("renderInvoicePdf (integration)", () => {
  const managerId = randomUUID();
  const managerScope = makeScope(managerId, "manager");

  beforeAll(async () => {
    await db.insert(user).values({
      id: managerId,
      name: "Invoice PDF Test Manager",
      email: `invoice-pdf-manager-${managerId}@test.local`,
      emailVerified: true,
      role: "manager",
    });
  });

  afterAll(async () => {
    const testClients = await db
      .select({ id: clients.id })
      .from(clients)
      .where(ilike(clients.phone, "+919876606%"));
    const clientIds = testClients.map((c) => c.id);
    if (clientIds.length > 0) {
      await db.delete(invoices).where(inArray(invoices.clientId, clientIds));
    }
    await db.delete(clients).where(ilike(clients.phone, "+919876606%"));
    await db.delete(user).where(eq(user.id, managerId));
  });

  it("renders a real invoice to a non-empty PDF buffer with a valid PDF header", async () => {
    const [client] = await db
      .insert(clients)
      .values({
        type: "individual",
        name: "PDF Test Client",
        phone: "+919876606001",
        createdBy: managerId,
      })
      .returning();
    if (!client) throw new Error("setup failed");

    const invoice = await createInvoice(
      {
        clientId: client.id,
        lineItems: [{ description: "PDF render test line item", qty: 1, ratePaise: 100000 }],
        gstRate: 18,
        dueDate: new Date("2026-09-01T00:00:00.000Z"),
      },
      managerScope,
    );
    if (!invoice) throw new Error("setup failed");

    const buffer = await renderInvoicePdf(invoice.id);
    expect(buffer).not.toBeNull();
    expect(buffer?.byteLength).toBeGreaterThan(0);
    expect(buffer?.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("returns null for an invoice that doesn't exist", async () => {
    expect(await renderInvoicePdf(randomUUID())).toBeNull();
  });
});
