import { notifyClientWhatsApp } from "@/jobs/notify";
import { getBoss } from "@/lib/queue";

export const MARKETING_LEAD_RECEIVED_JOB = "marketing-lead-received";

type MarketingLeadReceivedPayload = { leadId: string; name: string; phone: string };

/**
 * Instant WhatsApp acknowledgment for a lead submitted through the public marketing site —
 * distinct from lead-notifications.ts's `lead-assigned` job, which notifies the assigned
 * staff member instead of the lead. Never call the WhatsApp API inline (spec 4.8).
 */
export async function enqueueMarketingLeadReceivedNotification(
  payload: MarketingLeadReceivedPayload,
): Promise<void> {
  const boss = await getBoss();
  await boss.send(MARKETING_LEAD_RECEIVED_JOB, payload);
}

export async function registerMarketingLeadNotificationJobs(): Promise<void> {
  const boss = await getBoss();
  await boss.createQueue(MARKETING_LEAD_RECEIVED_JOB);

  await boss.work<MarketingLeadReceivedPayload>(MARKETING_LEAD_RECEIVED_JOB, async (jobs) => {
    for (const job of jobs) {
      await notifyClientWhatsApp({
        phone: job.data.phone,
        whatsappOptedOut: false,
        eventKey: "lead_received_ack",
        bodyParams: [job.data.name],
        entityType: "lead",
        entityId: job.data.leadId,
      });
    }
  });
}
