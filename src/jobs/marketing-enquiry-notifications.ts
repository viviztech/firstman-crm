import { notifyClientWhatsApp, notifyEmail } from "@/jobs/notify";
import { getBoss } from "@/lib/queue";
import { getEnquiryForNotification } from "@/services/enquiries";

export const MARKETING_ENQUIRY_RECEIVED_JOB = "marketing-enquiry-received";

type MarketingEnquiryReceivedPayload = { enquiryId: string; name: string; phone: string };

/**
 * Instant acknowledgment (WhatsApp + email) for an enquiry submitted through the public
 * marketing site or partner API — distinct from enquiry-notifications.ts's `enquiry-assigned`
 * job, which notifies the assigned staff member instead of the enquirer. Never call the
 * WhatsApp/email API inline (spec 4.8).
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

      const enquiry = await getEnquiryForNotification(job.data.enquiryId);
      await notifyEmail({
        to: enquiry?.email,
        subject: "Thanks for reaching out to FirstMan Corporate Services",
        heading: "We've received your enquiry",
        lines: [
          `Hi ${job.data.name}, thank you for getting in touch with FirstMan Corporate Services.`,
          "One of our team members will contact you shortly to discuss your requirements.",
        ],
        template: "enquiry_received_ack",
        entityType: "enquiry",
        entityId: job.data.enquiryId,
      });
    }
  });
}
