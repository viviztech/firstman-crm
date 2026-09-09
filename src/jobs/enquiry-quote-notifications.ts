import { notifyEmail } from "@/jobs/notify";
import { getAppUrl } from "@/lib/app-url";
import { logger } from "@/lib/logger";
import { formatMoney } from "@/lib/money";
import { getBoss } from "@/lib/queue";
import { getQuotePdfUrl, getQuoteResponseUrl } from "@/lib/signed-url";
import { recordMessageLog } from "@/services/message-log";
import { createQuoteForEnquiry, getQuoteForNotification, markQuoteSent } from "@/services/quotes";
import { sendWhatsAppDocument } from "@/services/whatsapp";

export const ENQUIRY_QUOTE_ISSUED_JOB = "enquiry-quote-issued";
export const QUOTE_REVISED_JOB = "quote-revised";

type EnquiryQuoteIssuedPayload = { enquiryId: string };
type QuoteRevisedPayload = { quoteId: string };

type NotifiableQuote = NonNullable<Awaited<ReturnType<typeof getQuoteForNotification>>>;

/**
 * Generates and sends a fee quote as soon as an enquiry names an interested service — from the
 * public marketing form, the partner API, or staff logging a walk-in/phone enquiry (ADR 0010).
 * Never call the WhatsApp/email API inline — always enqueue (spec 4.8).
 */
export async function enqueueEnquiryQuoteIssuedNotification(
  payload: EnquiryQuoteIssuedPayload,
): Promise<void> {
  const boss = await getBoss();
  await boss.send(ENQUIRY_QUOTE_ISSUED_JOB, payload);
}

/** Sends a staff-edited revision (services/quotes.ts's reviseQuote) to the client — the quote
 * already exists, so unlike the issued-notification job above this never generates one. */
export async function enqueueQuoteRevisedNotification(payload: QuoteRevisedPayload): Promise<void> {
  const boss = await getBoss();
  await boss.send(QUOTE_REVISED_JOB, payload);
}

/** WhatsApp document + email send, shared by the initial issue and every later revision, so a
 *  client always gets the same notification shape regardless of which triggered it. The response
 *  link (Option A of the quote-approval feature — see lib/signed-url.ts) is the primary call to
 *  action in the email and appended to the WhatsApp caption, so approving/negotiating never needs
 *  a CRM login. */
async function sendQuoteNotification(quote: NotifiableQuote): Promise<void> {
  const pdfUrl = getAppUrl(getQuotePdfUrl(quote.id));
  const responseUrl = getAppUrl(getQuoteResponseUrl(quote.id));

  const result = await sendWhatsAppDocument({
    to: quote.clientPhone,
    documentUrl: pdfUrl,
    filename: `${quote.quoteNo}.pdf`,
    caption: `Your quote for ${quote.serviceName} — ${formatMoney(quote.totalPaise)}\n\nApprove or discuss this quote: ${responseUrl}`,
  });
  await recordMessageLog({
    channel: "whatsapp",
    to: quote.clientPhone,
    template: "enquiry_quote_issued",
    payload: { pdfUrl, responseUrl },
    status: result.ok ? "sent" : "failed",
    error: result.ok ? undefined : result.error,
    entityType: "quote",
    entityId: quote.id,
  });

  await notifyEmail({
    to: quote.clientEmail,
    subject: `Your quote for ${quote.serviceName}`,
    heading: "Here's your fee estimate",
    lines: [
      `Thanks for your interest in ${quote.serviceName}. Based on the details you shared, here's our fee estimate${quote.stateName ? ` for ${quote.stateName}` : ""}: ${formatMoney(quote.totalPaise)}.`,
      "This is an estimate — we'll confirm final fees once we've reviewed your requirements and documents.",
      `You can also download the quote PDF directly: ${pdfUrl}`,
    ],
    ctaLabel: "Approve or discuss this quote",
    ctaUrl: responseUrl,
    template: "enquiry_quote_issued",
    entityType: "quote",
    entityId: quote.id,
  });

  await markQuoteSent(quote.id);
}

/** The actual per-event work — factored out so tests can call it directly, without round-tripping through pg-boss's async worker dispatch. */
export async function processEnquiryQuoteIssuedJob(
  payload: EnquiryQuoteIssuedPayload,
): Promise<void> {
  const created = await createQuoteForEnquiry(payload.enquiryId, null);
  if (!created) {
    logger.warn(payload, "enquiry-quote-issued: enquiry or its service no longer exists, skipping");
    return;
  }

  const quote = await getQuoteForNotification(created.id);
  if (!quote) return;

  await sendQuoteNotification(quote);
}

/** The actual per-event work for a revision — factored out for the same direct-call-in-tests reason. */
export async function processQuoteRevisedJob(payload: QuoteRevisedPayload): Promise<void> {
  const quote = await getQuoteForNotification(payload.quoteId);
  if (!quote) {
    logger.warn(payload, "quote-revised: quote no longer exists, skipping");
    return;
  }

  await sendQuoteNotification(quote);
}

export async function registerEnquiryQuoteNotificationJobs(): Promise<void> {
  const boss = await getBoss();
  await boss.createQueue(ENQUIRY_QUOTE_ISSUED_JOB);
  await boss.createQueue(QUOTE_REVISED_JOB);

  await boss.work<EnquiryQuoteIssuedPayload>(ENQUIRY_QUOTE_ISSUED_JOB, async (jobs) => {
    for (const job of jobs) {
      await processEnquiryQuoteIssuedJob(job.data);
    }
  });

  await boss.work<QuoteRevisedPayload>(QUOTE_REVISED_JOB, async (jobs) => {
    for (const job of jobs) {
      await processQuoteRevisedJob(job.data);
    }
  });
}
