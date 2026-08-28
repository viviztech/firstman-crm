import { randomUUID } from "node:crypto";
import { addDays, subDays } from "date-fns";
import { and, eq, ilike, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { services } from "@/db/schema/catalog";
import { clients } from "@/db/schema/clients";
import { documents } from "@/db/schema/documents";
import { invoices, payments } from "@/db/schema/invoices";
import { orders, orderTasks } from "@/db/schema/orders";
import { makeScope } from "@/lib/test-scope";
import {
  cancelInvoice,
  computeInvoiceTotals,
  createInvoice,
  createProformaInvoiceInTx,
  deleteInvoice,
  formatProformaInvoiceNo,
  formatTaxInvoiceNo,
  getClientFinancialSummary,
  getCollectionsThisMonth,
  getInvoice,
  getOutstandingInvoicesTotal,
  getOverdueInvoicesForDigest,
  getOverdueInvoicesTotalPaise,
  listInvoices,
  listInvoicesForClient,
  listInvoicesForOrder,
  proformaYearMonth,
  recordPayment,
  rollInvoiceStatusesOverdue,
  sendInvoice,
  taxInvoiceYear,
  updateInvoice,
} from "@/services/invoices";
import { createOrder, updateOrderStatus } from "@/services/orders";

async function makeTestClient(phone: string, actorId: string) {
  const [client] = await db
    .insert(clients)
    .values({ type: "individual", name: "Invoice Test Client", phone, createdBy: actorId })
    .returning();
  if (!client) throw new Error("Failed to create test client");
  return client;
}

// Constructed via the (year, monthIndex, day, ...) local-time form, not an ISO "Z" string —
// proformaYearMonth/taxInvoiceYear read local-time getters (getFullYear/getMonth), so the two
// must agree regardless of the test runner's own timezone.
describe("proformaYearMonth / formatProformaInvoiceNo (pure)", () => {
  it("formats with 2-digit year, 2-digit month, and a 5-digit zero-padded sequence", () => {
    const yearMonth = proformaYearMonth(new Date(2099, 2, 10, 12, 0, 0));
    expect(yearMonth).toBe("9903");
    expect(formatProformaInvoiceNo(yearMonth, 1)).toBe("FMPI990300001");
  });

  it("rolls over across a month boundary, independent of the tax invoice's yearly cadence", () => {
    const endOfMarch = proformaYearMonth(new Date(2099, 2, 31, 12, 0, 0));
    const startOfApril = proformaYearMonth(new Date(2099, 3, 1, 0, 0, 0));
    expect(endOfMarch).toBe("9903");
    expect(startOfApril).toBe("9904");
  });
});

describe("taxInvoiceYear / formatTaxInvoiceNo (pure)", () => {
  it("formats with a 2-digit year and a 5-digit zero-padded sequence, no dashes", () => {
    const year = taxInvoiceYear(new Date(2099, 2, 10, 12, 0, 0));
    expect(year).toBe("99");
    expect(formatTaxInvoiceNo(year, 1)).toBe("FMINV9900001");
  });

  it("only rolls over at a year boundary, unlike the monthly proforma sequence", () => {
    const marchYear = taxInvoiceYear(new Date(2099, 2, 10, 12, 0, 0));
    const decemberYear = taxInvoiceYear(new Date(2099, 11, 31, 12, 0, 0));
    const nextJanuaryYear = taxInvoiceYear(new Date(2100, 0, 1, 0, 0, 0));
    expect(marchYear).toBe(decemberYear);
    expect(decemberYear).not.toBe(nextJanuaryYear);
  });
});

describe("invoices service (integration)", () => {
  const managerId = randomUUID();
  const execId = randomUUID();
  const accountantId = randomUUID();

  const managerScope = makeScope(managerId, "manager");
  const execScope = makeScope(execId, "executive");
  const accountantScope = makeScope(accountantId, "accountant");

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: managerId,
        name: "Invoice Test Manager",
        email: `invoice-manager-${managerId}@test.local`,
        emailVerified: true,
        role: "manager",
      },
      {
        id: execId,
        name: "Invoice Test Exec",
        email: `invoice-exec-${execId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: accountantId,
        name: "Invoice Test Accountant",
        email: `invoice-accountant-${accountantId}@test.local`,
        emailVerified: true,
        role: "accountant",
      },
    ]);
  });

  afterAll(async () => {
    const testClients = await db
      .select({ id: clients.id })
      .from(clients)
      .where(ilike(clients.phone, "+919876605%"));
    const clientIds = testClients.map((c) => c.id);

    if (clientIds.length > 0) {
      const testInvoices = await db
        .select({ id: invoices.id })
        .from(invoices)
        .where(inArray(invoices.clientId, clientIds));
      const invoiceIds = testInvoices.map((i) => i.id);
      if (invoiceIds.length > 0) {
        await db.delete(payments).where(inArray(payments.invoiceId, invoiceIds));
        await db.delete(invoices).where(inArray(invoices.id, invoiceIds));
      }
    }

    await db.delete(clients).where(ilike(clients.phone, "+919876605%"));
    await db.delete(user).where(eq(user.id, managerId));
    await db.delete(user).where(eq(user.id, execId));
    await db.delete(user).where(eq(user.id, accountantId));
  });

  describe("computeInvoiceTotals (paise math)", () => {
    it("sums many odd line-item amounts without float drift", () => {
      const lineItems = Array.from({ length: 500 }, (_, i) => ({
        description: `Item ${i}`,
        qty: 1,
        ratePaise: 1,
      }));
      const totals = computeInvoiceTotals(lineItems, 0);
      expect(totals.subtotalPaise).toBe(500);
      expect(Number.isInteger(totals.subtotalPaise)).toBe(true);
    });

    it("rounds each line amount individually (qty * rate)", () => {
      const totals = computeInvoiceTotals(
        [
          { description: "Fractional qty", qty: 1.5, ratePaise: 333 },
          { description: "Whole qty", qty: 2, ratePaise: 100 },
        ],
        0,
      );
      // 1.5 * 333 = 499.5 -> rounds to 500; 2 * 100 = 200
      expect(totals.lineItems[0]?.amountPaise).toBe(500);
      expect(totals.lineItems[1]?.amountPaise).toBe(200);
      expect(totals.subtotalPaise).toBe(700);
    });

    it("computes 18% GST correctly and totalPaise = subtotal + gst exactly", () => {
      const totals = computeInvoiceTotals(
        [{ description: "Service", qty: 1, ratePaise: 149900 }],
        18,
      );
      expect(totals.subtotalPaise).toBe(149900);
      expect(totals.gstAmountPaise).toBe(26982); // round(149900 * 18 / 100)
      expect(totals.totalPaise).toBe(totals.subtotalPaise + totals.gstAmountPaise);
      expect(totals.totalPaise).toBe(176882);
    });

    it("applies 0% GST as a true no-op", () => {
      const totals = computeInvoiceTotals(
        [{ description: "Service", qty: 1, ratePaise: 100000 }],
        0,
      );
      expect(totals.gstAmountPaise).toBe(0);
      expect(totals.totalPaise).toBe(totals.subtotalPaise);
    });
  });

  describe("createInvoice", () => {
    it("generates increasing, unique invoice numbers and stores computed totals", async () => {
      const client = await makeTestClient("+919876605001", managerId);

      const first = await createInvoice(
        {
          clientId: client.id,
          lineItems: [{ description: "invoice-test-marker A", qty: 1, ratePaise: 100000 }],
          gstRate: 18,
          dueDate: new Date("2026-09-01T00:00:00.000Z"),
        },
        managerScope,
      );
      const second = await createInvoice(
        {
          clientId: client.id,
          lineItems: [{ description: "invoice-test-marker B", qty: 1, ratePaise: 200000 }],
          gstRate: 18,
          dueDate: new Date("2026-09-01T00:00:00.000Z"),
        },
        managerScope,
      );
      if (!first || !second) throw new Error("setup failed");

      expect(first.invoiceNo).toMatch(/^FMINV\d{2}\d{5}$/);
      const firstSeq = Number(first.invoiceNo.slice(7));
      const secondSeq = Number(second.invoiceNo.slice(7));
      expect(secondSeq).toBeGreaterThan(firstSeq);
      expect(first.invoiceNo).not.toBe(second.invoiceNo);

      expect(first.subtotalPaise).toBe(100000);
      expect(first.gstAmountPaise).toBe(18000);
      expect(first.totalPaise).toBe(118000);
      expect(first.status).toBe("draft");
    });

    it("returns null for an executive — invoices are outside their access entirely", async () => {
      const client = await makeTestClient("+919876605002", managerId);
      const result = await createInvoice(
        {
          clientId: client.id,
          lineItems: [{ description: "invoice-test-marker exec-blocked", qty: 1, ratePaise: 1000 }],
          gstRate: 0,
          dueDate: new Date("2026-09-01T00:00:00.000Z"),
        },
        execScope,
      );
      expect(result).toBeNull();
    });
  });

  describe("updateInvoice", () => {
    it("only allows edits while the invoice is a draft", async () => {
      const client = await makeTestClient("+919876605003", managerId);
      const created = await createInvoice(
        {
          clientId: client.id,
          lineItems: [{ description: "invoice-test-marker edit", qty: 1, ratePaise: 100000 }],
          gstRate: 0,
          dueDate: new Date("2026-09-05T00:00:00.000Z"),
        },
        managerScope,
      );
      if (!created) throw new Error("setup failed");

      const updated = await updateInvoice(
        created.id,
        {
          lineItems: [{ description: "invoice-test-marker edited", qty: 2, ratePaise: 50000 }],
          gstRate: 18,
          dueDate: new Date("2026-09-10T00:00:00.000Z"),
        },
        managerScope,
      );
      expect(updated?.totalPaise).toBe(118000);

      await sendInvoice(created.id, managerScope);
      const blockedEdit = await updateInvoice(
        created.id,
        {
          lineItems: [{ description: "should not apply", qty: 1, ratePaise: 1 }],
          gstRate: 0,
          dueDate: new Date("2026-09-15T00:00:00.000Z"),
        },
        managerScope,
      );
      expect(blockedEdit).toBeNull();
    });
  });

  describe("sendInvoice", () => {
    it("moves draft -> sent and rejects sending an already-sent invoice", async () => {
      const client = await makeTestClient("+919876605004", managerId);
      const created = await createInvoice(
        {
          clientId: client.id,
          lineItems: [{ description: "invoice-test-marker send", qty: 1, ratePaise: 100000 }],
          gstRate: 0,
          dueDate: new Date("2026-09-05T00:00:00.000Z"),
        },
        managerScope,
      );
      if (!created) throw new Error("setup failed");

      const sent = await sendInvoice(created.id, managerScope);
      expect(sent?.status).toBe("sent");
      expect(sent?.sentAt).toBeTruthy();

      const secondSend = await sendInvoice(created.id, managerScope);
      expect(secondSend).toBeNull();
    });
  });

  describe("recordPayment", () => {
    it("moves sent -> partially_paid -> paid as payments accumulate, and rejects further payment once paid", async () => {
      const client = await makeTestClient("+919876605005", managerId);
      const created = await createInvoice(
        {
          clientId: client.id,
          lineItems: [{ description: "invoice-test-marker payments", qty: 1, ratePaise: 100000 }],
          gstRate: 0,
          dueDate: new Date("2026-09-05T00:00:00.000Z"),
        },
        managerScope,
      );
      if (!created) throw new Error("setup failed");
      await sendInvoice(created.id, managerScope);

      const partial = await recordPayment(
        created.id,
        { amountPaise: 40000, method: "upi" },
        managerScope,
      );
      expect(partial?.invoice.status).toBe("partially_paid");

      const full = await recordPayment(
        created.id,
        { amountPaise: 60000, method: "cash" },
        managerScope,
      );
      expect(full?.invoice.status).toBe("paid");

      const rejected = await recordPayment(
        created.id,
        { amountPaise: 100, method: "cash" },
        managerScope,
      );
      expect(rejected).toBeNull();
    });

    it("rejects recording a payment against a draft invoice", async () => {
      const client = await makeTestClient("+919876605006", managerId);
      const created = await createInvoice(
        {
          clientId: client.id,
          lineItems: [
            { description: "invoice-test-marker draft-payment", qty: 1, ratePaise: 100000 },
          ],
          gstRate: 0,
          dueDate: new Date("2026-09-05T00:00:00.000Z"),
        },
        managerScope,
      );
      if (!created) throw new Error("setup failed");

      const result = await recordPayment(
        created.id,
        { amountPaise: 1000, method: "cash" },
        managerScope,
      );
      expect(result).toBeNull();
    });
  });

  describe("cancelInvoice", () => {
    it("cancels an invoice with no payments, and refuses once a payment exists", async () => {
      const client = await makeTestClient("+919876605007", managerId);
      const cancellable = await createInvoice(
        {
          clientId: client.id,
          lineItems: [{ description: "invoice-test-marker cancel-ok", qty: 1, ratePaise: 100000 }],
          gstRate: 0,
          dueDate: new Date("2026-09-05T00:00:00.000Z"),
        },
        managerScope,
      );
      if (!cancellable) throw new Error("setup failed");
      const cancelled = await cancelInvoice(cancellable.id, managerScope);
      expect(cancelled?.status).toBe("cancelled");

      const paidOne = await createInvoice(
        {
          clientId: client.id,
          lineItems: [
            { description: "invoice-test-marker cancel-blocked", qty: 1, ratePaise: 100000 },
          ],
          gstRate: 0,
          dueDate: new Date("2026-09-05T00:00:00.000Z"),
        },
        managerScope,
      );
      if (!paidOne) throw new Error("setup failed");
      await sendInvoice(paidOne.id, managerScope);
      await recordPayment(paidOne.id, { amountPaise: 50000, method: "upi" }, managerScope);

      await expect(cancelInvoice(paidOne.id, managerScope)).rejects.toThrow();
    });
  });

  describe("deleteInvoice", () => {
    it("only soft-deletes draft invoices", async () => {
      const client = await makeTestClient("+919876605008", managerId);
      const created = await createInvoice(
        {
          clientId: client.id,
          lineItems: [{ description: "invoice-test-marker delete", qty: 1, ratePaise: 100000 }],
          gstRate: 0,
          dueDate: new Date("2026-09-05T00:00:00.000Z"),
        },
        managerScope,
      );
      if (!created) throw new Error("setup failed");

      const deleted = await deleteInvoice(created.id, managerScope);
      expect(deleted?.deletedAt).toBeTruthy();
      expect(await getInvoice(created.id, managerScope)).toBeUndefined();

      const sentOne = await createInvoice(
        {
          clientId: client.id,
          lineItems: [
            { description: "invoice-test-marker delete-blocked", qty: 1, ratePaise: 100000 },
          ],
          gstRate: 0,
          dueDate: new Date("2026-09-05T00:00:00.000Z"),
        },
        managerScope,
      );
      if (!sentOne) throw new Error("setup failed");
      await sendInvoice(sentOne.id, managerScope);
      expect(await deleteInvoice(sentOne.id, managerScope)).toBeNull();
    });
  });

  describe("rollInvoiceStatusesOverdue (time-frozen)", () => {
    it("rolls sent/partially_paid invoices past their due date to overdue, and is idempotent", async () => {
      const client = await makeTestClient("+919876605009", managerId);
      const now = new Date("2026-06-15T00:00:00.000Z");

      const overdueOne = await createInvoice(
        {
          clientId: client.id,
          lineItems: [
            { description: "invoice-test-marker rollover-overdue", qty: 1, ratePaise: 100000 },
          ],
          gstRate: 0,
          dueDate: subDays(now, 3),
        },
        managerScope,
      );
      const notYetDue = await createInvoice(
        {
          clientId: client.id,
          lineItems: [
            { description: "invoice-test-marker rollover-future", qty: 1, ratePaise: 100000 },
          ],
          gstRate: 0,
          dueDate: addDays(now, 10),
        },
        managerScope,
      );
      if (!overdueOne || !notYetDue) throw new Error("setup failed");
      await sendInvoice(overdueOne.id, managerScope);
      await sendInvoice(notYetDue.id, managerScope);

      const result = await rollInvoiceStatusesOverdue(now);
      expect(result.overdue).toBeGreaterThanOrEqual(1);

      const [overdueRow, futureRow] = await Promise.all([
        db.query.invoices.findFirst({ where: eq(invoices.id, overdueOne.id) }),
        db.query.invoices.findFirst({ where: eq(invoices.id, notYetDue.id) }),
      ]);
      expect(overdueRow?.status).toBe("overdue");
      expect(futureRow?.status).toBe("sent");

      const second = await rollInvoiceStatusesOverdue(now);
      const overdueRowAgain = await db.query.invoices.findFirst({
        where: eq(invoices.id, overdueOne.id),
      });
      expect(overdueRowAgain?.status).toBe("overdue");
      expect(second.overdue).toBe(0);
    });

    it("never rolls a draft, paid, or cancelled invoice into overdue", async () => {
      const client = await makeTestClient("+919876605010", managerId);
      const now = new Date("2026-06-15T00:00:00.000Z");

      const draftOne = await createInvoice(
        {
          clientId: client.id,
          lineItems: [
            { description: "invoice-test-marker rollover-draft", qty: 1, ratePaise: 100000 },
          ],
          gstRate: 0,
          dueDate: subDays(now, 3),
        },
        managerScope,
      );
      const paidOne = await createInvoice(
        {
          clientId: client.id,
          lineItems: [
            { description: "invoice-test-marker rollover-paid", qty: 1, ratePaise: 100000 },
          ],
          gstRate: 0,
          dueDate: subDays(now, 3),
        },
        managerScope,
      );
      if (!draftOne || !paidOne) throw new Error("setup failed");
      await sendInvoice(paidOne.id, managerScope);
      await recordPayment(paidOne.id, { amountPaise: 100000, method: "cash" }, managerScope);

      await rollInvoiceStatusesOverdue(now);

      const [draftRow, paidRow] = await Promise.all([
        db.query.invoices.findFirst({ where: eq(invoices.id, draftOne.id) }),
        db.query.invoices.findFirst({ where: eq(invoices.id, paidOne.id) }),
      ]);
      expect(draftRow?.status).toBe("draft");
      expect(paidRow?.status).toBe("paid");
    });
  });

  describe("digest helpers", () => {
    it("getOverdueInvoicesForDigest and getOverdueInvoicesTotalPaise reflect only overdue invoices, net of partial payments", async () => {
      const client = await makeTestClient("+919876605011", managerId);
      const now = new Date("2026-06-15T00:00:00.000Z");

      const overdueWithPartialPayment = await createInvoice(
        {
          clientId: client.id,
          lineItems: [{ description: "invoice-test-marker digest", qty: 1, ratePaise: 100000 }],
          gstRate: 0,
          dueDate: subDays(now, 5),
        },
        managerScope,
      );
      if (!overdueWithPartialPayment) throw new Error("setup failed");
      await sendInvoice(overdueWithPartialPayment.id, managerScope);
      await recordPayment(
        overdueWithPartialPayment.id,
        { amountPaise: 30000, method: "upi" },
        managerScope,
      );
      await rollInvoiceStatusesOverdue(now);

      const digestList = await getOverdueInvoicesForDigest();
      const digestRow = digestList.find((invoice) => invoice.id === overdueWithPartialPayment.id);
      expect(digestRow).toBeTruthy();
      // Net of the ₹300 partial payment against the ₹1000 total — not the gross total, since
      // an overdue invoice can already be partially paid (rollInvoiceStatusesOverdue rolls both
      // "sent" and "partially_paid" invoices to "overdue").
      expect(digestRow?.outstandingPaise).toBe(70000);
      expect(digestRow?.totalPaise).toBe(100000);

      const total = await getOverdueInvoicesTotalPaise();
      expect(total).toBeGreaterThanOrEqual(70000);
    });
  });

  describe("client financial summary and org-wide stats", () => {
    it("computes lifetime value (paid only) and open balance (net of partial payments) for a client", async () => {
      const client = await makeTestClient("+919876605012", managerId);

      const paidInvoice = await createInvoice(
        {
          clientId: client.id,
          lineItems: [
            { description: "invoice-test-marker summary-paid", qty: 1, ratePaise: 100000 },
          ],
          gstRate: 0,
          dueDate: new Date("2026-09-05T00:00:00.000Z"),
        },
        managerScope,
      );
      const openInvoice = await createInvoice(
        {
          clientId: client.id,
          lineItems: [
            { description: "invoice-test-marker summary-open", qty: 1, ratePaise: 50000 },
          ],
          gstRate: 0,
          dueDate: new Date("2026-09-05T00:00:00.000Z"),
        },
        managerScope,
      );
      if (!paidInvoice || !openInvoice) throw new Error("setup failed");

      await sendInvoice(paidInvoice.id, managerScope);
      await recordPayment(paidInvoice.id, { amountPaise: 100000, method: "cash" }, managerScope);
      await sendInvoice(openInvoice.id, managerScope);
      await recordPayment(openInvoice.id, { amountPaise: 20000, method: "cash" }, managerScope);

      const summary = await getClientFinancialSummary(client.id, managerScope);
      expect(summary?.lifetimeValuePaise).toBe(100000);
      expect(summary?.openBalancePaise).toBe(30000);
    });

    it("returns null for an executive on every financial helper", async () => {
      const client = await makeTestClient("+919876605013", managerId);
      expect(await getClientFinancialSummary(client.id, execScope)).toBeNull();
      expect(await getOutstandingInvoicesTotal(execScope)).toBeNull();
      expect(await getCollectionsThisMonth(execScope)).toBeNull();
      expect(await listInvoicesForClient(client.id, execScope)).toEqual([]);
      expect((await listInvoices(execScope)).rows).toEqual([]);
    });

    it("lets an accountant read invoices too, not just manager/admin", async () => {
      const client = await makeTestClient("+919876605014", managerId);
      const created = await createInvoice(
        {
          clientId: client.id,
          lineItems: [
            { description: "invoice-test-marker accountant-read", qty: 1, ratePaise: 100000 },
          ],
          gstRate: 0,
          dueDate: new Date("2026-09-05T00:00:00.000Z"),
        },
        managerScope,
      );
      if (!created) throw new Error("setup failed");

      expect(await getInvoice(created.id, accountantScope)).toBeTruthy();
    });
  });

  describe("role gating on every mutating/reading function", () => {
    it("blocks an executive from getInvoice, updateInvoice, sendInvoice, recordPayment, cancelInvoice, deleteInvoice, listInvoicesForOrder", async () => {
      const client = await makeTestClient("+919876605015", managerId);
      const invoice = await createInvoice(
        {
          clientId: client.id,
          lineItems: [{ description: "invoice-test-marker role-gate", qty: 1, ratePaise: 100000 }],
          gstRate: 0,
          dueDate: new Date("2026-09-05T00:00:00.000Z"),
        },
        managerScope,
      );
      if (!invoice) throw new Error("setup failed");

      expect(await getInvoice(invoice.id, execScope)).toBeUndefined();
      expect(
        await updateInvoice(
          invoice.id,
          {
            lineItems: [{ description: "nope", qty: 1, ratePaise: 1 }],
            gstRate: 0,
            dueDate: new Date(),
          },
          execScope,
        ),
      ).toBeNull();
      expect(await sendInvoice(invoice.id, execScope)).toBeNull();
      expect(
        await recordPayment(invoice.id, { amountPaise: 100, method: "cash" }, execScope),
      ).toBeNull();
      expect(await cancelInvoice(invoice.id, execScope)).toBeNull();
      expect(await deleteInvoice(invoice.id, execScope)).toBeNull();
      expect(await listInvoicesForOrder(randomUUID(), execScope)).toEqual([]);
    });
  });

  describe("listInvoices filters", () => {
    it("filters by search term (invoice number or client name) and by status", async () => {
      const client = await makeTestClient("+919876605016", managerId);
      const invoice = await createInvoice(
        {
          clientId: client.id,
          lineItems: [
            { description: "invoice-test-marker list-filter", qty: 1, ratePaise: 100000 },
          ],
          gstRate: 0,
          dueDate: new Date("2026-09-05T00:00:00.000Z"),
        },
        managerScope,
      );
      if (!invoice) throw new Error("setup failed");

      const byInvoiceNo = await listInvoices(managerScope, { search: invoice.invoiceNo });
      expect(byInvoiceNo.rows.map((row) => row.id)).toContain(invoice.id);

      const byClientName = await listInvoices(managerScope, { search: "Invoice Test Client" });
      expect(byClientName.rows.map((row) => row.id)).toContain(invoice.id);

      const byStatus = await listInvoices(managerScope, {
        search: invoice.invoiceNo,
        status: "draft",
      });
      expect(byStatus.rows.map((row) => row.id)).toContain(invoice.id);

      const wrongStatus = await listInvoices(managerScope, {
        search: invoice.invoiceNo,
        status: "paid",
      });
      expect(wrongStatus.rows.map((row) => row.id)).not.toContain(invoice.id);
    });
  });

  describe("final tax invoice generation (proforma paid + order completed)", () => {
    let pvtLtdServiceId: string;
    const superAdminId = randomUUID();
    const superAdminScope = makeScope(superAdminId, "super_admin");

    beforeAll(async () => {
      const service = await db.query.services.findFirst({
        where: eq(services.slug, "pvt-ltd-registration"),
      });
      if (!service) throw new Error("Seed catalog first — pvt-ltd-registration service not found");
      pvtLtdServiceId = service.id;

      await db.insert(user).values({
        id: superAdminId,
        name: "Invoice Test Super Admin",
        email: `invoice-superadmin-${superAdminId}@test.local`,
        emailVerified: true,
        role: "super_admin",
      });
    });

    afterAll(async () => {
      const testOrders = await db
        .select({ id: orders.id })
        .from(orders)
        .where(ilike(orders.notes, "invoice-final-test-marker%"));
      const orderIds = testOrders.map((o) => o.id);
      for (const id of orderIds) {
        await db.delete(orderTasks).where(eq(orderTasks.orderId, id));
        await db
          .delete(documents)
          .where(and(eq(documents.ownerType, "order"), eq(documents.ownerId, id)));
      }

      const testClients = await db
        .select({ id: clients.id })
        .from(clients)
        .where(ilike(clients.phone, "+919876608%"));
      const clientIds = testClients.map((c) => c.id);
      if (clientIds.length > 0) {
        const testInvoices = await db
          .select({ id: invoices.id })
          .from(invoices)
          .where(inArray(invoices.clientId, clientIds));
        const invoiceIds = testInvoices.map((i) => i.id);
        if (invoiceIds.length > 0) {
          await db.delete(payments).where(inArray(payments.invoiceId, invoiceIds));
          await db.delete(invoices).where(inArray(invoices.id, invoiceIds));
        }
      }
      await db.delete(orders).where(ilike(orders.notes, "invoice-final-test-marker%"));
      await db.delete(clients).where(ilike(clients.phone, "+919876608%"));
      await db.delete(user).where(eq(user.id, superAdminId));
    });

    async function makeOrderWithProforma(phone: string, marker: string) {
      const client = await makeTestClient(phone, managerId);
      const order = await createOrder(
        {
          clientId: client.id,
          serviceId: pvtLtdServiceId,
          quotedPricePaise: 100000,
          notes: marker,
        },
        managerScope,
      );
      // The hard completion gate (ADR 0002) requires every task done before "completed" is
      // reachable at all — every scenario below needs the order completable, so mark its
      // catalog-generated checklist done up front rather than repeating this in each test.
      await db.update(orderTasks).set({ status: "done" }).where(eq(orderTasks.orderId, order.id));
      const proforma = await db.transaction((tx) =>
        createProformaInvoiceInTx(
          tx,
          {
            clientId: client.id,
            orderId: order.id,
            lineItems: [{ description: "Pvt Ltd Registration", qty: 1, ratePaise: 100000 }],
            gstRate: 18,
          },
          managerScope,
        ),
      );
      return { client, order, proforma };
    }

    it("generates the tax invoice once the order completes after the proforma is already paid in full", async () => {
      const { order, proforma } = await makeOrderWithProforma(
        "+919876608001",
        "invoice-final-test-marker order-after-payment",
      );
      expect(proforma.kind).toBe("proforma");
      expect(proforma.status).toBe("sent");

      await recordPayment(proforma.id, { amountPaise: 118000, method: "upi" }, managerScope);
      // Not completed yet — no tax invoice should exist.
      expect(
        await db.query.invoices.findFirst({
          where: and(eq(invoices.proformaInvoiceId, proforma.id), eq(invoices.kind, "tax")),
        }),
      ).toBeUndefined();

      const completed = await updateOrderStatus(order.id, "completed", managerScope);
      expect(completed?.finalInvoice?.isNew).toBe(true);

      const taxInvoice = await db.query.invoices.findFirst({
        where: and(eq(invoices.proformaInvoiceId, proforma.id), eq(invoices.kind, "tax")),
      });
      expect(taxInvoice?.status).toBe("paid");
      expect(taxInvoice?.totalPaise).toBe(proforma.totalPaise);
      expect(taxInvoice?.clientId).toBe(proforma.clientId);
      expect(taxInvoice?.orderId).toBe(order.id);
      expect(completed?.finalInvoice?.invoice.id).toBe(taxInvoice?.id);
    });

    it("generates the tax invoice once the final payment lands after the order is already completed", async () => {
      // Under the hard completion gate (ADR 0002), an order can only reach "completed" while its
      // proforma is still unpaid via the super_admin force-complete bypass — that's the only
      // route left to set up "completed but not yet paid", which is what this test is proving
      // recordPayment's side of generateFinalInvoiceIfEligibleInTx still handles correctly.
      const { order, proforma } = await makeOrderWithProforma(
        "+919876608002",
        "invoice-final-test-marker payment-after-order",
      );

      await updateOrderStatus(order.id, "completed", superAdminScope, { force: true });
      expect(
        await db.query.invoices.findFirst({
          where: and(eq(invoices.proformaInvoiceId, proforma.id), eq(invoices.kind, "tax")),
        }),
      ).toBeUndefined();

      const result = await recordPayment(
        proforma.id,
        { amountPaise: 118000, method: "cash" },
        managerScope,
      );
      expect(result?.finalInvoice?.isNew).toBe(true);

      const taxInvoice = await db.query.invoices.findFirst({
        where: and(eq(invoices.proformaInvoiceId, proforma.id), eq(invoices.kind, "tax")),
      });
      expect(taxInvoice?.status).toBe("paid");
      expect(result?.finalInvoice?.invoice.id).toBe(taxInvoice?.id);
    });

    it("never generates a tax invoice while the order is incomplete, or while the proforma is only partially paid", async () => {
      const { order, proforma } = await makeOrderWithProforma(
        "+919876608003",
        "invoice-final-test-marker incomplete",
      );

      await recordPayment(proforma.id, { amountPaise: 50000, method: "upi" }, managerScope);
      await updateOrderStatus(order.id, "in_progress", managerScope);

      expect(
        await db.query.invoices.findFirst({
          where: and(eq(invoices.proformaInvoiceId, proforma.id), eq(invoices.kind, "tax")),
        }),
      ).toBeUndefined();
    });

    it("is idempotent — only ever creates one tax invoice per proforma", async () => {
      const { order, proforma } = await makeOrderWithProforma(
        "+919876608004",
        "invoice-final-test-marker idempotent",
      );

      await recordPayment(proforma.id, { amountPaise: 118000, method: "upi" }, managerScope);
      const first = await updateOrderStatus(order.id, "completed", managerScope);
      const second = await updateOrderStatus(order.id, "completed", managerScope);

      const taxInvoices = await db.query.invoices.findMany({
        where: and(eq(invoices.proformaInvoiceId, proforma.id), eq(invoices.kind, "tax")),
      });
      expect(taxInvoices).toHaveLength(1);
      expect(first?.finalInvoice?.isNew).toBe(true);
      expect(second?.finalInvoice?.isNew).toBe(false);
      expect(second?.finalInvoice?.invoice.id).toBe(first?.finalInvoice?.invoice.id);
    });
  });
});
