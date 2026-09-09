import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { enquiries } from "@/db/schema/enquiries";
import { type QuoteLineItem, quotes } from "@/db/schema/quotes";
import type { ActorScope } from "@/lib/scope";
import { recordActivity } from "@/services/activity-log";
import { enquiryScopeCondition } from "@/services/enquiries";
import { computeServiceQuote } from "@/services/service-pricing";
import { getSetting, getSettingForUpdate, setSetting } from "@/services/settings";

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Shared with the Sales-conversion proforma invoice default (services/enquiries.ts) — one
 *  business-wide "default GST rate" setting, editable from Settings. */
const DEFAULT_GST_RATE_KEY = "defaultGstRate";

/** Government fees, stamp duty, and other statutory pass-through components are never GST-able —
 *  only FirstMan's own Professional fee line is (mirrors quote-document.tsx's TAXABLE_LINE_LABEL). */
const TAXABLE_LINE_LABEL = "Professional fee";

/**
 * GST applies only to FirstMan's own Professional fee line — government fees, stamp duty, and
 * other statutory pass-through components (Name Approval/DSC/DIN/SPICe/MOA/AOA and similar) are
 * never taxed by the firm, so they're excluded from the GST base.
 */
function computeGstAmountPaise(
  lineItems: { label: string; amountPaise: number }[],
  gstRate: number,
): number {
  const professionalFeePaise = lineItems
    .filter((item) => item.label === TAXABLE_LINE_LABEL)
    .reduce((sum, item) => sum + item.amountPaise, 0);
  return Math.round((professionalFeePaise * gstRate) / 100);
}

async function computeQuoteGst(components: { label: string; amountPaise: number }[]) {
  const gstRate = await getSetting<number>(DEFAULT_GST_RATE_KEY, 18);
  return { gstRate, gstAmountPaise: computeGstAmountPaise(components, gstRate) };
}

export const quoteLineItemInputSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(200),
  qty: z.coerce.number().int().positive(),
  ratePaise: z.coerce.number().int().nonnegative(),
});

export const reviseQuoteInputSchema = z.object({
  lineItems: z.array(quoteLineItemInputSchema).min(1, "Add at least one line item"),
  gstRate: z.coerce.number().int().min(0).max(100),
});

export type ReviseQuoteInput = z.infer<typeof reviseQuoteInputSchema>;

/**
 * Year+month component shared by the quote sequence's settings key and its display format
 * (mirrors proformaYearMonth in services/invoices.ts) — pure and exported for month-boundary
 * unit tests without DB access or faked global timers.
 */
export function quoteYearMonth(now: Date): string {
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}`;
}

/** Quote number, format FMQT<year+month><5-digit seq> — monthly reset, its own sequence. */
export function formatQuoteNo(yearMonth: string, seq: number): string {
  return `FMQT${yearMonth}${String(seq).padStart(5, "0")}`;
}

async function generateQuoteNo(tx: Transaction, actor: ActorScope | null): Promise<string> {
  const yearMonth = quoteYearMonth(new Date());
  const key = `quoteNumberSeq:${yearMonth}`;
  const last = await getSettingForUpdate<number>(key, 0, tx);
  const next = last + 1;
  await setSetting(key, next, actor, tx);
  return formatQuoteNo(yearMonth, next);
}

/**
 * Generates and persists a quote for an enquiry's interested service, snapshotting the
 * enquirer's contact details and the fee breakdown at this moment (ADR 0010) — a later edit to
 * the enquiry, the catalog, or state pricing never rewrites a quote already sent out. Returns
 * null when the enquiry has no interested service or no longer exists (nothing to quote).
 */
export async function createQuoteForEnquiry(enquiryId: string, actor: ActorScope | null) {
  const enquiry = await db.query.enquiries.findFirst({
    where: eq(enquiries.id, enquiryId),
    with: { serviceInterested: { columns: { id: true, name: true } } },
  });
  const service = enquiry?.serviceInterested;
  if (!service) return null;

  const quote = await computeServiceQuote(
    service.id,
    enquiry.state,
    enquiry.numberOfDirectors,
    enquiry.capitalAmountPaise,
  );
  if (!quote) return null;

  const { gstRate, gstAmountPaise } = await computeQuoteGst(quote.components);

  return db.transaction(async (tx) => {
    const quoteNo = await generateQuoteNo(tx, actor);

    const [created] = await tx
      .insert(quotes)
      .values({
        quoteNo,
        enquiryId: enquiry.id,
        clientName: enquiry.name,
        clientPhone: enquiry.phone,
        clientEmail: enquiry.email,
        serviceId: service.id,
        serviceName: service.name,
        stateName: enquiry.state,
        numberOfDirectors: enquiry.numberOfDirectors,
        capitalAmountPaise: enquiry.capitalAmountPaise,
        lineItems: quote.components,
        subtotalPaise: quote.totalPaise,
        gstRate,
        gstAmountPaise,
        totalPaise: quote.totalPaise + gstAmountPaise,
        createdBy: actor?.userId ?? null,
        updatedBy: actor?.userId ?? null,
      })
      .returning();
    if (!created) throw new Error("Failed to create quote");

    return created;
  });
}

export async function markQuoteSent(id: string): Promise<void> {
  await db.update(quotes).set({ sentAt: new Date() }).where(eq(quotes.id, id));
}

/** Scoped fetch for the revise-quote dialog — an executive can only load a quote whose enquiry
 *  is visible to them (quotes have no assignedTo/pincode of their own, so authorization always
 *  routes through the parent enquiry). Returns null if the quote or its enquiry isn't in scope. */
export async function getQuoteForRevision(quoteId: string, actor: ActorScope) {
  const quote = await db.query.quotes.findFirst({ where: eq(quotes.id, quoteId) });
  if (!quote) return null;

  const conditions = [eq(enquiries.id, quote.enquiryId), isNull(enquiries.deletedAt)];
  const scoped = enquiryScopeCondition(actor);
  if (scoped) conditions.push(scoped);
  const enquiry = await db.query.enquiries.findFirst({ where: and(...conditions) });
  if (!enquiry) return null;

  return quote;
}

/**
 * Edits a quote by creating a new revision rather than mutating the original in place — the
 * original stays an untouched historical record of exactly what (if anything) was already sent
 * to the client (mirrors createQuoteForEnquiry's own snapshot rationale). `listQuotesForEnquiry`
 * orders newest-first, so the revision naturally becomes "the" current quote without needing a
 * separate superseded flag. Returns null when the base quote or its enquiry isn't visible to the
 * actor (executives are scoped to their own assigned enquiries, same as every other enquiry
 * action).
 */
export async function reviseQuote(quoteId: string, input: ReviseQuoteInput, actor: ActorScope) {
  return db.transaction(async (tx) => {
    const base = await tx.query.quotes.findFirst({ where: eq(quotes.id, quoteId) });
    if (!base) return null;

    const enquiryConditions = [eq(enquiries.id, base.enquiryId), isNull(enquiries.deletedAt)];
    const scoped = enquiryScopeCondition(actor);
    if (scoped) enquiryConditions.push(scoped);
    const enquiry = await tx.query.enquiries.findFirst({ where: and(...enquiryConditions) });
    if (!enquiry) return null;

    const lineItems: QuoteLineItem[] = input.lineItems.map((item) => ({
      label: item.label,
      qty: item.qty,
      ratePaise: item.ratePaise,
      amountPaise: item.qty * item.ratePaise,
    }));
    const subtotalPaise = lineItems.reduce((sum, item) => sum + item.amountPaise, 0);
    const gstAmountPaise = computeGstAmountPaise(lineItems, input.gstRate);

    const quoteNo = await generateQuoteNo(tx, actor);
    const [created] = await tx
      .insert(quotes)
      .values({
        quoteNo,
        enquiryId: base.enquiryId,
        clientName: base.clientName,
        clientPhone: base.clientPhone,
        clientEmail: base.clientEmail,
        serviceId: base.serviceId,
        serviceName: base.serviceName,
        stateName: base.stateName,
        numberOfDirectors: base.numberOfDirectors,
        capitalAmountPaise: base.capitalAmountPaise,
        lineItems,
        subtotalPaise,
        gstRate: input.gstRate,
        gstAmountPaise,
        totalPaise: subtotalPaise + gstAmountPaise,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .returning();
    if (!created) throw new Error("Failed to create quote revision");

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "quote",
        entityId: created.id,
        action: "revised",
        diff: { basedOnQuoteId: base.id, lineItems, gstRate: input.gstRate },
      },
      tx,
    );

    return created;
  });
}

/** Fields the quote PDF template needs. */
export async function getQuoteForPdf(id: string) {
  return db.query.quotes.findFirst({ where: eq(quotes.id, id) });
}

/** Fields the send-quote notification job needs. */
export async function getQuoteForNotification(id: string) {
  return db.query.quotes.findFirst({ where: eq(quotes.id, id) });
}

/** An enquiry's quote history, newest first — for the enquiry detail screen. */
export async function listQuotesForEnquiry(enquiryId: string) {
  return db.query.quotes.findMany({
    where: eq(quotes.enquiryId, enquiryId),
    orderBy: [desc(quotes.createdAt)],
  });
}
