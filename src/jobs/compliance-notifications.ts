import { logger } from "@/lib/logger";
import { getBoss } from "@/lib/queue";

export const COMPLIANCE_REMINDER_JOB = "compliance-reminder";
export const COMPLIANCE_INTERNAL_TASK_JOB = "compliance-internal-task";

type ComplianceReminderPayload = {
  complianceItemId: string;
  clientId: string;
  title: string;
  dueDate: string;
  daysUntilDue: number;
};

type ComplianceInternalTaskPayload = {
  complianceItemId: string;
  assignedTo: string;
  title: string;
  dueDate: string;
};

/** Never call the WhatsApp/email API inline — always enqueue (spec 4.6, 4.8). */
export async function enqueueComplianceReminder(payload: ComplianceReminderPayload): Promise<void> {
  const boss = await getBoss();
  await boss.send(COMPLIANCE_REMINDER_JOB, payload);
}

export async function enqueueComplianceInternalTask(
  payload: ComplianceInternalTaskPayload,
): Promise<void> {
  const boss = await getBoss();
  await boss.send(COMPLIANCE_INTERNAL_TASK_JOB, payload);
}

export async function registerComplianceNotificationJobs(): Promise<void> {
  const boss = await getBoss();
  await boss.createQueue(COMPLIANCE_REMINDER_JOB);
  await boss.createQueue(COMPLIANCE_INTERNAL_TASK_JOB);

  await boss.work<ComplianceReminderPayload>(COMPLIANCE_REMINDER_JOB, async (jobs) => {
    for (const job of jobs) {
      // WHATSAPP_TOKEN is empty in dev, so this stays a log-only driver (spec 4.8).
      // Phase 7 replaces this body with real WhatsApp + email sends + message_logs rows.
      logger.info(
        {
          complianceItemId: job.data.complianceItemId,
          clientId: job.data.clientId,
          daysUntilDue: job.data.daysUntilDue,
        },
        "notification: compliance deadline reminder (WhatsApp+email send stub)",
      );
    }
  });

  await boss.work<ComplianceInternalTaskPayload>(COMPLIANCE_INTERNAL_TASK_JOB, async (jobs) => {
    for (const job of jobs) {
      logger.info(
        { complianceItemId: job.data.complianceItemId, assignedTo: job.data.assignedTo },
        "notification: compliance internal task reminder (T-15)",
      );
    }
  });
}
