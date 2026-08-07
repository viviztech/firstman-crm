import { addDays, endOfMonth, startOfMonth } from "date-fns";
import { and, count, desc, eq, gte, ilike, inArray, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { clients } from "@/db/schema/clients";
import {
  type InvoiceLineItem,
  type invoiceStatusEnum,
  invoices,
  paymentMethodEnum,
  payments,
} from "@/db/schema/invoices";
import { orders } from "@/db/schema/orders";
import type { Role } from "@/lib/auth";
import { sumPaise } from "@/lib/money";
import type { ActorScope } from "@/lib/scope";
import { optionalTrimmed, optionalUuid } from "@/lib/validation/helpers";
import { recordActivity } from "@/services/activity-log";
import { getSetting, getSettingForUpdate, setSetting } from "@/services/settings";

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const PAGE_SIZE = 20;
const OPEN_STATUSES = ["sent", "partially_paid", "overdue"] as const;
const PAYABLE_STATUSES = ["sent", "partially_paid", "overdue"] as const;

type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number];

/** Executives have no access to the invoices module at all (spec 3, nav-config) — not scoped, blocked. */
const ALLOWED_ROLES: Role[] = ["super_admin", "manager", "accountant"];
function canAccessInvoices(scope: ActorScope): boolean {
  return ALLOWED_ROLES.includes(scope.role);
}

export const invoiceLineItemInputSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(300),
  qty: z.coerce.number().positive("Quantity must be greater than 0"),
  ratePaise: z.coerce.number().int().nonnegative(),
});

export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemInputSchema>;

const gstRateSchema = z.coerce
  .number()
  .refine((value) => value === 0 || value === 18, "GST rate must be 0% or 18%");

export const invoiceInputSchema = z.object({
  clientId: z.string().uuid("Choose a client"),
  orderId: optionalUuid,
  lineItems: z.array(invoiceLineItemInputSchema).min(1, "Add at least one line item"),
  gstRate: gstRateSchema,
  dueDate: z.coerce.date(),
});

export type InvoiceInput = z.infer<typeof invoiceInputSchema>;

/** Edits never move an invoice to a different client — create a new one for that. */
export const invoiceEditSchema = z.object({
  orderId: optionalUuid,
  lineItems: z.array(invoiceLineItemInputSchema).min(1, "Add at least one line item"),
  gstRate: gstRateSchema,
  dueDate: z.coerce.date(),
});

export type InvoiceEditInput = z.infer<typeof invoiceEditSchema>;

export const paymentInputSchema = z.object({
  amountPaise: z.coerce.number().int().positive("Amount must be greater than 0"),
  method: z.enum(paymentMethodEnum.enumValues),
  reference: optionalTrimmed(200),
});

export type PaymentInput = z.infer<typeof paymentInputSchema>;

/** amountPaise = round(qty * ratePaise) — the only place quantity and rate ever get multiplied. */
function computeLineItemAmount(qty: number, ratePaise: number): number {
  return Math.round(qty * ratePaise);
}

/** All money math stays in integer paise: line amounts round individually, GST rounds off the summed subtotal. */
export function computeInvoiceTotals(lineItems: InvoiceLineItemInput[], gstRate: number) {
  const itemsWithAmount: InvoiceLineItem[] = lineItems.map((item) => ({
    description: item.description,
    qty: item.qty,
    ratePaise: item.ratePaise,
    amountPaise: computeLineItemAmount(item.qty, item.ratePaise),
  }));
  const subtotalPaise = sumPaise(itemsWithAmount.map((item) => item.amountPaise));
  const gstAmountPaise = Math.round((subtotalPaise * gstRate) / 100);
  const totalPaise = subtotalPaise + gstAmountPaise;
  return { lineItems: itemsWithAmount, subtotalPaise, gstAmountPaise, totalPaise };
}

async function generateInvoiceNo(tx: Transaction, actor: ActorScope): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = await getSetting<string>("invoicePrefix", "FM-INV", tx);
  const key = `invoiceNumberSeq:${year}`;
  const last = await getSettingForUpdate<number>(key, 0, tx);
  const next = last + 1;
  await setSetting(key, next, actor, tx);
  return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
}

async function paidSumsByInvoiceIds(invoiceIds: string[]): Promise<Map<string, number>> {
  if (invoiceIds.length === 0) return new Map();

  const rows = await db
    .select({ invoiceId: payments.invoiceId, amountPaise: payments.amountPaise })
    .from(payments)
    .where(inArray(payments.invoiceId, invoiceIds));

  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.invoiceId, (map.get(row.invoiceId) ?? 0) + row.amountPaise);
  }
  return map;
}

export async function listInvoices(
  scope: ActorScope,
  opts: { page?: number; search?: string; status?: string } = {},
) {
  if (!canAccessInvoices(scope)) return { rows: [], total: 0, page: 1, pageSize: PAGE_SIZE };

  const page = Math.max(1, opts.page ?? 1);
  const conditions = [isNull(invoices.deletedAt)];
  if (opts.search) {
    const term = `%${opts.search}%`;
    const searchCondition = or(ilike(invoices.invoiceNo, term), ilike(clients.name, term));
    if (searchCondition) conditions.push(searchCondition);
  }
  if (opts.status) {
    conditions.push(eq(invoices.status, opts.status as InvoiceStatus));
  }
  const where = and(...conditions);

  const selection = {
    id: invoices.id,
    invoiceNo: invoices.invoiceNo,
    status: invoices.status,
    kind: invoices.kind,
    totalPaise: invoices.totalPaise,
    dueDate: invoices.dueDate,
    sentAt: invoices.sentAt,
    clientId: clients.id,
    clientName: clients.name,
  };

  const [rows, totalRows] = await Promise.all([
    db
      .select(selection)
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(where)
      .orderBy(desc(invoices.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(where),
  ]);

  return { rows, total: totalRows[0]?.total ?? 0, page, pageSize: PAGE_SIZE };
}

/** All of a client's invoices, unpaginated — for the client profile's Invoices tab. */
export async function listInvoicesForClient(clientId: string, scope: ActorScope) {
  if (!canAccessInvoices(scope)) return [];

  return db.query.invoices.findMany({
    where: and(eq(invoices.clientId, clientId), isNull(invoices.deletedAt)),
    orderBy: (invoice, { desc: descFn }) => [descFn(invoice.createdAt)],
  });
}

/** All invoices linked to an order — for the order detail page's Invoices tab. */
export async function listInvoicesForOrder(orderId: string, scope: ActorScope) {
  if (!canAccessInvoices(scope)) return [];

  return db.query.invoices.findMany({
    where: and(eq(invoices.orderId, orderId), isNull(invoices.deletedAt)),
    orderBy: (invoice, { desc: descFn }) => [descFn(invoice.createdAt)],
  });
}

export async function getInvoice(id: string, scope: ActorScope) {
  if (!canAccessInvoices(scope)) return undefined;

  return db.query.invoices.findFirst({
    where: and(eq(invoices.id, id), isNull(invoices.deletedAt)),
    with: {
      client: {
        columns: {
          id: true,
          name: true,
          phone: true,
          email: true,
          gstin: true,
          address: true,
          city: true,
          state: true,
          pincode: true,
        },
      },
      order: { columns: { id: true, orderNo: true } },
      payments: { orderBy: (payment, { desc: descFn }) => [descFn(payment.paidAt)] },
    },
  });
}

/**
 * Unscoped fetch for PDF rendering — the caller (the signed-link route handler) has already
 * authorized the request via `verifyInvoicePdfToken`, so no session/role check happens here.
 * External recipients (email/WhatsApp links) never have a CRM session at all.
 */
export async function getInvoiceForPdf(id: string) {
  return db.query.invoices.findFirst({
    where: and(eq(invoices.id, id), isNull(invoices.deletedAt)),
    with: {
      client: {
        columns: {
          name: true,
          phone: true,
          gstin: true,
          address: true,
          city: true,
          state: true,
          pincode: true,
        },
      },
      order: { columns: { orderNo: true } },
    },
  });
}

/** Unscoped fetch for notification jobs — system-context, not a user request (mirrors getInvoiceForPdf). */
export async function getInvoiceForNotification(id: string) {
  return db.query.invoices.findFirst({
    where: and(eq(invoices.id, id), isNull(invoices.deletedAt)),
    columns: { id: true, invoiceNo: true, totalPaise: true },
    with: {
      client: {
        columns: { id: true, name: true, phone: true, email: true, whatsappOptedOut: true },
      },
    },
  });
}

export async function createInvoice(input: InvoiceInput, actor: ActorScope) {
  if (!canAccessInvoices(actor)) return null;

  return db.transaction(async (tx) => {
    const totals = computeInvoiceTotals(input.lineItems, input.gstRate);
    const invoiceNo = await generateInvoiceNo(tx, actor);

    const [created] = await tx
      .insert(invoices)
      .values({
        invoiceNo,
        clientId: input.clientId,
        orderId: input.orderId,
        lineItems: totals.lineItems,
        subtotalPaise: totals.subtotalPaise,
        gstRate: input.gstRate,
        gstAmountPaise: totals.gstAmountPaise,
        totalPaise: totals.totalPaise,
        dueDate: input.dueDate,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .returning();
    if (!created) throw new Error("Failed to create invoice");

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "invoice",
        entityId: created.id,
        action: "created",
        diff: { invoiceNo, totalPaise: totals.totalPaise },
      },
      tx,
    );

    return created;
  });
}

/**
 * Issues the proforma invoice generated as part of the enquiry Sales action (spec 4.1/4.7
 * extension): a non-fiscal advance-payment request, sent immediately rather than left in
 * draft. Composed into the caller's transaction (mirrors `createOrderInTx`) so it lands
 * atomically alongside the client/order it belongs to.
 */
export async function createProformaInvoiceInTx(
  tx: Transaction,
  input: {
    clientId: string;
    orderId: string;
    lineItems: InvoiceLineItemInput[];
    gstRate: number;
    dueDate?: Date;
  },
  actor: ActorScope,
) {
  const totals = computeInvoiceTotals(input.lineItems, input.gstRate);
  const invoiceNo = await generateInvoiceNo(tx, actor);

  const [created] = await tx
    .insert(invoices)
    .values({
      invoiceNo,
      clientId: input.clientId,
      orderId: input.orderId,
      lineItems: totals.lineItems,
      subtotalPaise: totals.subtotalPaise,
      gstRate: input.gstRate,
      gstAmountPaise: totals.gstAmountPaise,
      totalPaise: totals.totalPaise,
      status: "sent",
      kind: "proforma",
      dueDate: input.dueDate ?? addDays(new Date(), 7),
      sentAt: new Date(),
      createdBy: actor.userId,
      updatedBy: actor.userId,
    })
    .returning();
  if (!created) throw new Error("Failed to create proforma invoice");

  await recordActivity(
    {
      actorId: actor.userId,
      entityType: "invoice",
      entityId: created.id,
      action: "created",
      diff: { invoiceNo, kind: "proforma", totalPaise: totals.totalPaise },
    },
    tx,
  );

  return created;
}

/**
 * The final GST invoice is never created directly by a user — it's auto-generated once both
 * halves of the condition are true: the order is `completed` and its proforma invoice is
 * `paid` in full. Called from both directions (order completion and payment recording) since
 * either can be the one that arrives last; idempotent (a proforma only ever spawns one tax
 * invoice) so calling it from both is safe. Line items/totals are copied verbatim from the
 * proforma — the money was already collected against it, so no new `payments` rows are
 * created here (that would double-count in collections totals); the tax invoice is inserted
 * already `paid`, with the proforma as its payment trail of record.
 */
export async function generateFinalInvoiceIfEligibleInTx(
  tx: Transaction,
  orderId: string,
  actor: ActorScope,
) {
  const order = await tx.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (order?.status !== "completed") return null;

  const proforma = await tx.query.invoices.findFirst({
    where: and(
      eq(invoices.orderId, orderId),
      eq(invoices.kind, "proforma"),
      isNull(invoices.deletedAt),
    ),
    orderBy: (invoice, { desc: descFn }) => [descFn(invoice.createdAt)],
  });
  if (proforma?.status !== "paid") return null;

  const existingTaxInvoice = await tx.query.invoices.findFirst({
    where: and(eq(invoices.proformaInvoiceId, proforma.id), eq(invoices.kind, "tax")),
  });
  if (existingTaxInvoice) return existingTaxInvoice;

  const invoiceNo = await generateInvoiceNo(tx, actor);

  const [created] = await tx
    .insert(invoices)
    .values({
      invoiceNo,
      clientId: proforma.clientId,
      orderId: proforma.orderId,
      lineItems: proforma.lineItems,
      subtotalPaise: proforma.subtotalPaise,
      gstRate: proforma.gstRate,
      gstAmountPaise: proforma.gstAmountPaise,
      totalPaise: proforma.totalPaise,
      status: "paid",
      kind: "tax",
      proformaInvoiceId: proforma.id,
      dueDate: new Date(),
      sentAt: new Date(),
      createdBy: actor.userId,
      updatedBy: actor.userId,
    })
    .returning();
  if (!created) throw new Error("Failed to create final invoice");

  await recordActivity(
    {
      actorId: actor.userId,
      entityType: "invoice",
      entityId: created.id,
      action: "created_from_proforma",
      diff: { invoiceNo, proformaInvoiceId: proforma.id, orderId },
    },
    tx,
  );

  return created;
}

/** Only draft invoices can be edited — once sent, the numbers must stay fixed. */
export async function updateInvoice(id: string, input: InvoiceEditInput, actor: ActorScope) {
  if (!canAccessInvoices(actor)) return null;

  return db.transaction(async (tx) => {
    const existing = await tx.query.invoices.findFirst({
      where: and(eq(invoices.id, id), isNull(invoices.deletedAt)),
    });
    if (existing?.status !== "draft") return null;

    const totals = computeInvoiceTotals(input.lineItems, input.gstRate);

    const [updated] = await tx
      .update(invoices)
      .set({
        orderId: input.orderId,
        lineItems: totals.lineItems,
        subtotalPaise: totals.subtotalPaise,
        gstRate: input.gstRate,
        gstAmountPaise: totals.gstAmountPaise,
        totalPaise: totals.totalPaise,
        dueDate: input.dueDate,
        updatedBy: actor.userId,
      })
      .where(eq(invoices.id, id))
      .returning();
    if (!updated) return null;

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "invoice",
        entityId: updated.id,
        action: "updated",
        diff: { totalPaise: totals.totalPaise },
      },
      tx,
    );

    return updated;
  });
}

/** draft -> sent. The caller enqueues the client notification (spec 4.8). */
export async function sendInvoice(id: string, actor: ActorScope) {
  if (!canAccessInvoices(actor)) return null;

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(invoices)
      .set({ status: "sent", sentAt: new Date(), updatedBy: actor.userId })
      .where(and(eq(invoices.id, id), isNull(invoices.deletedAt), eq(invoices.status, "draft")))
      .returning();
    if (!updated) return null;

    await recordActivity(
      { actorId: actor.userId, entityType: "invoice", entityId: updated.id, action: "sent" },
      tx,
    );

    return updated;
  });
}

/** Records a payment and recalculates the invoice's status from the total paid so far (spec 4.7). */
export async function recordPayment(invoiceId: string, input: PaymentInput, actor: ActorScope) {
  if (!canAccessInvoices(actor)) return null;

  return db.transaction(async (tx) => {
    const invoice = await tx.query.invoices.findFirst({
      where: and(eq(invoices.id, invoiceId), isNull(invoices.deletedAt)),
    });
    if (!invoice || !(PAYABLE_STATUSES as readonly string[]).includes(invoice.status)) return null;

    const [payment] = await tx
      .insert(payments)
      .values({
        invoiceId,
        amountPaise: input.amountPaise,
        method: input.method,
        reference: input.reference,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .returning();
    if (!payment) throw new Error("Failed to record payment");

    const existingPayments = await tx
      .select({ amountPaise: payments.amountPaise })
      .from(payments)
      .where(eq(payments.invoiceId, invoiceId));
    const paidSoFar = sumPaise(existingPayments.map((row) => row.amountPaise));
    const newStatus: InvoiceStatus = paidSoFar >= invoice.totalPaise ? "paid" : "partially_paid";

    const [updatedInvoice] = await tx
      .update(invoices)
      .set({ status: newStatus, updatedBy: actor.userId })
      .where(eq(invoices.id, invoiceId))
      .returning();
    if (!updatedInvoice) throw new Error("Failed to update invoice status");

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "invoice",
        entityId: invoiceId,
        action: "payment_recorded",
        diff: { amountPaise: input.amountPaise, method: input.method, newStatus },
      },
      tx,
    );

    if (newStatus === "paid" && invoice.kind === "proforma" && invoice.orderId) {
      await generateFinalInvoiceIfEligibleInTx(tx, invoice.orderId, actor);
    }

    return { payment, invoice: updatedInvoice };
  });
}

/** Only invoices with no recorded payments can be cancelled — otherwise the payment trail must stand. */
export async function cancelInvoice(id: string, actor: ActorScope) {
  if (!canAccessInvoices(actor)) return null;

  return db.transaction(async (tx) => {
    const invoice = await tx.query.invoices.findFirst({
      where: and(eq(invoices.id, id), isNull(invoices.deletedAt)),
    });
    if (!invoice || invoice.status === "cancelled") return null;

    const existingPayments = await tx
      .select({ amountPaise: payments.amountPaise })
      .from(payments)
      .where(eq(payments.invoiceId, id));
    if (existingPayments.length > 0) {
      throw new Error("Cannot cancel an invoice that already has recorded payments");
    }

    const [updated] = await tx
      .update(invoices)
      .set({ status: "cancelled", updatedBy: actor.userId })
      .where(eq(invoices.id, id))
      .returning();
    if (!updated) throw new Error("Failed to cancel invoice");

    await recordActivity(
      { actorId: actor.userId, entityType: "invoice", entityId: updated.id, action: "cancelled" },
      tx,
    );

    return updated;
  });
}

/** Soft-deletes a draft invoice only — sent/paid invoices are permanent records. */
export async function deleteInvoice(id: string, actor: ActorScope) {
  if (!canAccessInvoices(actor)) return null;

  return db.transaction(async (tx) => {
    const [deleted] = await tx
      .update(invoices)
      .set({ deletedAt: new Date(), updatedBy: actor.userId })
      .where(and(eq(invoices.id, id), isNull(invoices.deletedAt), eq(invoices.status, "draft")))
      .returning();
    if (!deleted) return null;

    await recordActivity(
      { actorId: actor.userId, entityType: "invoice", entityId: deleted.id, action: "deleted" },
      tx,
    );

    return deleted;
  });
}

/** Nightly rollover (spec 4.7 digest, mirrors compliance's rollover): sent/partially_paid past due -> overdue. */
export async function rollInvoiceStatusesOverdue(
  now: Date = new Date(),
): Promise<{ overdue: number }> {
  const rows = await db
    .update(invoices)
    .set({ status: "overdue" })
    .where(
      and(
        isNull(invoices.deletedAt),
        lte(invoices.dueDate, now),
        inArray(invoices.status, ["sent", "partially_paid"]),
      ),
    )
    .returning({ id: invoices.id });

  return { overdue: rows.length };
}

/** Overdue invoices with client info, for the daily accountant+manager digest (spec 4.7). */
export async function getOverdueInvoicesForDigest() {
  return db.query.invoices.findMany({
    where: and(isNull(invoices.deletedAt), eq(invoices.status, "overdue")),
    with: { client: { columns: { id: true, name: true } } },
  });
}

/** Unpaid balance across overdue invoices only (nets out any partial payments) — for the digest total. */
export async function getOverdueInvoicesTotalPaise(): Promise<number> {
  const overdueInvoices = await db.query.invoices.findMany({
    where: and(isNull(invoices.deletedAt), eq(invoices.status, "overdue")),
    columns: { id: true, totalPaise: true },
  });
  const paidSums = await paidSumsByInvoiceIds(overdueInvoices.map((invoice) => invoice.id));

  return sumPaise(
    overdueInvoices.map((invoice) => invoice.totalPaise - (paidSums.get(invoice.id) ?? 0)),
  );
}

/** Sum of paid invoices (lifetime value) and total unpaid balance across open invoices — client Overview tab. */
export async function getClientFinancialSummary(clientId: string, scope: ActorScope) {
  if (!canAccessInvoices(scope)) return null;

  const clientInvoices = await db.query.invoices.findMany({
    where: and(eq(invoices.clientId, clientId), isNull(invoices.deletedAt)),
    columns: { id: true, status: true, totalPaise: true },
  });

  const paidSums = await paidSumsByInvoiceIds(clientInvoices.map((invoice) => invoice.id));

  const lifetimeValuePaise = sumPaise(
    clientInvoices
      .filter((invoice) => invoice.status === "paid")
      .map((invoice) => invoice.totalPaise),
  );
  const openBalancePaise = sumPaise(
    clientInvoices
      .filter((invoice) => (OPEN_STATUSES as readonly string[]).includes(invoice.status))
      .map((invoice) => invoice.totalPaise - (paidSums.get(invoice.id) ?? 0)),
  );

  return { lifetimeValuePaise, openBalancePaise };
}

/** Total unpaid balance across every open invoice, company-wide — accountant dashboard widget. */
export async function getOutstandingInvoicesTotal(scope: ActorScope): Promise<number | null> {
  if (!canAccessInvoices(scope)) return null;

  const openInvoices = await db.query.invoices.findMany({
    where: and(isNull(invoices.deletedAt), inArray(invoices.status, OPEN_STATUSES)),
    columns: { id: true, totalPaise: true },
  });
  const paidSums = await paidSumsByInvoiceIds(openInvoices.map((invoice) => invoice.id));

  return sumPaise(
    openInvoices.map((invoice) => invoice.totalPaise - (paidSums.get(invoice.id) ?? 0)),
  );
}

/** Sum of payments recorded this calendar month — accountant dashboard widget. */
export async function getCollectionsThisMonth(
  scope: ActorScope,
  now: Date = new Date(),
): Promise<number | null> {
  if (!canAccessInvoices(scope)) return null;

  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const rows = await db
    .select({ amountPaise: payments.amountPaise })
    .from(payments)
    .where(and(gte(payments.paidAt, monthStart), lte(payments.paidAt, monthEnd)));

  return sumPaise(rows.map((row) => row.amountPaise));
}
