import { notifyClientWhatsApp, notifyEmail } from "@/jobs/notify";
import { getAppUrl } from "@/lib/app-url";
import { getBoss } from "@/lib/queue";
import { getUserContact } from "@/services/users";

export const COMPLIANCE_REMINDER_JOB = "compliance-reminder";
export const COMPLIANCE_INTERNAL_TASK_JOB = "compliance-internal-task";

type ComplianceReminderPayload = {
  complianceItemId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  whatsappOptedOut: boolean;
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
      const { complianceItemId, clientPhone, clientEmail, whatsappOptedOut, title, daysUntilDue } =
        job.data;
      const dueLabel = daysUntilDue === 1 ? "tomorrow" : `in ${daysUntilDue} days`;

      await notifyClientWhatsApp({
        phone: clientPhone,
        whatsappOptedOut,
        eventKey: "compliance_reminder",
        bodyParams: [job.data.clientName, title, dueLabel],
        entityType: "compliance_item",
        entityId: complianceItemId,
      });

      await notifyEmail({
        to: clientEmail,
        subject: `Reminder: ${title} due ${dueLabel}`,
        heading: "Upcoming compliance deadline",
        lines: [
          `${title} is due ${dueLabel}.`,
          "Please share any pending documents so we can file on time.",
        ],
        ctaLabel: "View details",
        ctaUrl: getAppUrl(`/compliance/${complianceItemId}`),
        template: "compliance_reminder",
        entityType: "compliance_item",
        entityId: complianceItemId,
      });
    }
  });

  await boss.work<ComplianceInternalTaskPayload>(COMPLIANCE_INTERNAL_TASK_JOB, async (jobs) => {
    for (const job of jobs) {
      const assignee = await getUserContact(job.data.assignedTo);
      if (!assignee) continue;

      await notifyEmail({
        to: assignee.email,
        subject: `Action needed: ${job.data.title}`,
        heading: "Compliance deadline in 15 days",
        lines: [`${job.data.title} is due in 15 days for a client assigned to you.`],
        ctaLabel: "View details",
        ctaUrl: getAppUrl(`/compliance/${job.data.complianceItemId}`),
        template: "compliance_internal_task",
        entityType: "compliance_item",
        entityId: job.data.complianceItemId,
      });
    }
  });
}
