import { notifyEmail } from "@/jobs/notify";
import { getAppUrl } from "@/lib/app-url";
import { logger } from "@/lib/logger";
import { formatMoney } from "@/lib/money";
import { getBoss } from "@/lib/queue";
import { getQuotePdfUrl } from "@/lib/signed-url";
import { recordMessageLog } from "@/services/message-log";
import { createQuoteForEnquiry, getQuoteForNotification, markQuoteSent } from "@/services/quotes";
import { sendWhatsAppDocument } from "@/services/whatsapp";

export const ENQUIRY_QUOTE_ISSUED_JOB = "enquiry-quote-issued";

type EnquiryQuoteIssuedPayload = { enquiryId: string };

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

  const pdfUrl = getAppUrl(getQuotePdfUrl(quote.id));

  const result = await sendWhatsAppDocument({
    to: quote.clientPhone,
    documentUrl: pdfUrl,
    filename: `${quote.quoteNo}.pdf`,
    caption: `Your quote for ${quote.serviceName} — ${formatMoney(quote.totalPaise)}`,
  });
  await recordMessageLog({
    channel: "whatsapp",
    to: quote.clientPhone,
    template: "enquiry_quote_issued",
    payload: { pdfUrl },
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
    ],
    ctaLabel: "Download your quote",
    ctaUrl: pdfUrl,
    template: "enquiry_quote_issued",
    entityType: "quote",
    entityId: quote.id,
  });

  await markQuoteSent(quote.id);
}

export async function registerEnquiryQuoteNotificationJobs(): Promise<void> {
  const boss = await getBoss();
  await boss.createQueue(ENQUIRY_QUOTE_ISSUED_JOB);

  await boss.work<EnquiryQuoteIssuedPayload>(ENQUIRY_QUOTE_ISSUED_JOB, async (jobs) => {
    for (const job of jobs) {
      await processEnquiryQuoteIssuedJob(job.data);
    }
  });
}
