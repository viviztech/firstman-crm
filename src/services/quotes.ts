import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { enquiries } from "@/db/schema/enquiries";
import { quotes } from "@/db/schema/quotes";
import type { ActorScope } from "@/lib/scope";
import { computeServiceQuote } from "@/services/service-pricing";
import { getSetting, getSettingForUpdate, setSetting } from "@/services/settings";

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Shared with the Sales-conversion proforma invoice default (services/enquiries.ts) — one
 *  business-wide "default GST rate" setting, editable from Settings. */
const DEFAULT_GST_RATE_KEY = "defaultGstRate";

/**
 * GST applies only to FirstMan's own Professional fee line — government fees, stamp duty, and
 * other statutory pass-through components (Name Approval/DSC/DIN/SPICe/MOA/AOA and similar) are
 * never taxed by the firm, so they're excluded from the GST base.
 */
async function computeQuoteGst(components: { label: string; amountPaise: number }[]) {
  const gstRate = await getSetting<number>(DEFAULT_GST_RATE_KEY, 18);
  const professionalFeePaise = components
    .filter((item) => item.label === "Professional fee")
    .reduce((sum, item) => sum + item.amountPaise, 0);
  const gstAmountPaise = Math.round((professionalFeePaise * gstRate) / 100);
  return { gstRate, gstAmountPaise };
}

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
