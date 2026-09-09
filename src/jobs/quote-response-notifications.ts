import { notifyEmail } from "@/jobs/notify";
import { getAppUrl } from "@/lib/app-url";
import { logger } from "@/lib/logger";
import { getBoss } from "@/lib/queue";
import { createNotification } from "@/services/notifications";
import { getQuoteForResponseNotification } from "@/services/quotes";

export const QUOTE_RESPONDED_JOB = "quote-responded";

type QuoteRespondedPayload = { quoteId: string };

/** Tells the enquiry's assigned staff how the client responded — never call the WhatsApp/email
 * API inline — always enqueue (spec 4.8). */
export async function enqueueQuoteRespondedNotification(
  payload: QuoteRespondedPayload,
): Promise<void> {
  const boss = await getBoss();
  await boss.send(QUOTE_RESPONDED_JOB, payload);
}

/** The actual per-event work — factored out so tests can call it directly, without round-tripping through pg-boss's async worker dispatch. */
export async function processQuoteRespondedJob(payload: QuoteRespondedPayload): Promise<void> {
  const quote = await getQuoteForResponseNotification(payload.quoteId);
  const assignee = quote?.enquiry?.assignee;
  if (!quote || !assignee) {
    logger.warn(payload, "quote-responded: quote or its enquiry's assignee not found, skipping");
    return;
  }

  const decision = quote.clientResponse === "approved" ? "approved" : "wants to negotiate on";
  const enquiryUrl = getAppUrl(`/enquiries/${quote.enquiry.id}`);

  // Staff have no phone number on file in this data model — internal notifications go by email only.
  await notifyEmail({
    to: assignee.email,
    subject: `${quote.clientName} ${decision} their quote (${quote.quoteNo})`,
    heading:
      quote.clientResponse === "approved"
        ? "A client approved their quote"
        : "A client wants to negotiate",
    lines: [
      `${quote.clientName} ${decision} ${quote.quoteNo} for ${quote.serviceName}.`,
      ...(quote.clientResponseNote ? [`Their note: "${quote.clientResponseNote}"`] : []),
      quote.clientResponse === "approved"
        ? "Follow up to close the sale."
        : "Follow up to discuss and, if needed, send a revised quote.",
    ],
    ctaLabel: "View enquiry",
    ctaUrl: enquiryUrl,
    template: "quote_responded",
    entityType: "quote",
    entityId: quote.id,
  });

  await createNotification({
    userId: assignee.id,
    type: "quote_responded",
    title: `${quote.clientName} ${decision} their quote`,
    body: quote.clientResponseNote ?? quote.quoteNo,
    href: `/enquiries/${quote.enquiry.id}`,
    entityType: "quote",
    entityId: quote.id,
  });
}

export async function registerQuoteResponseNotificationJobs(): Promise<void> {
  const boss = await getBoss();
  await boss.createQueue(QUOTE_RESPONDED_JOB);

  await boss.work<QuoteRespondedPayload>(QUOTE_RESPONDED_JOB, async (jobs) => {
    for (const job of jobs) {
      await processQuoteRespondedJob(job.data);
    }
  });
}
