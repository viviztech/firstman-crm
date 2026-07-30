import { logger } from "@/lib/logger";
import { getBoss } from "@/lib/queue";

export const LEAD_ASSIGNED_JOB = "lead-assigned";

type LeadAssignedPayload = { leadId: string; assignedTo: string };

/** Never call the WhatsApp/notification API inline — always enqueue (spec 4.8). */
export async function enqueueLeadAssignedNotification(payload: LeadAssignedPayload): Promise<void> {
  const boss = await getBoss();
  await boss.send(LEAD_ASSIGNED_JOB, payload);
}

export async function registerLeadNotificationJobs(): Promise<void> {
  const boss = await getBoss();
  await boss.createQueue(LEAD_ASSIGNED_JOB);

  await boss.work<LeadAssignedPayload>(LEAD_ASSIGNED_JOB, async (jobs) => {
    for (const job of jobs) {
      // WHATSAPP_TOKEN is empty in dev, so this stays a log-only driver (spec 4.8).
      // Phase 7 replaces this body with a real WhatsApp send + message_logs row.
      logger.info(
        { leadId: job.data.leadId, assignedTo: job.data.assignedTo },
        "notification: new lead assigned (WhatsApp send stub)",
      );
    }
  });
}
