import { notifyClientWhatsApp } from "@/jobs/notify";
import { getBoss } from "@/lib/queue";

export const MARKETING_ENQUIRY_RECEIVED_JOB = "marketing-enquiry-received";

type MarketingEnquiryReceivedPayload = { enquiryId: string; name: string; phone: string };

/**
 * Instant WhatsApp acknowledgment for an enquiry submitted through the public marketing site —
 * distinct from enquiry-notifications.ts's `enquiry-assigned` job, which notifies the assigned
 * staff member instead of the enquirer. Never call the WhatsApp API inline (spec 4.8).
 */
export async function enqueueMarketingEnquiryReceivedNotification(
  payload: MarketingEnquiryReceivedPayload,
): Promise<void> {
  const boss = await getBoss();
  await boss.send(MARKETING_ENQUIRY_RECEIVED_JOB, payload);
}

export async function registerMarketingEnquiryNotificationJobs(): Promise<void> {
  const boss = await getBoss();
  await boss.createQueue(MARKETING_ENQUIRY_RECEIVED_JOB);

  await boss.work<MarketingEnquiryReceivedPayload>(MARKETING_ENQUIRY_RECEIVED_JOB, async (jobs) => {
    for (const job of jobs) {
      await notifyClientWhatsApp({
        phone: job.data.phone,
        whatsappOptedOut: false,
        eventKey: "enquiry_received_ack",
        bodyParams: [job.data.name],
        entityType: "enquiry",
        entityId: job.data.enquiryId,
      });
    }
  });
}
