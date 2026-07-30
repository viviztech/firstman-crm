import {
  enqueueComplianceInternalTask,
  enqueueComplianceReminder,
} from "@/jobs/compliance-notifications";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getBoss } from "@/lib/queue";
import { getItemsDueInDays, rollComplianceStatuses } from "@/services/compliance";

export const COMPLIANCE_NIGHTLY_JOB = "compliance-nightly-rollover";

const REMINDER_DAY_OFFSETS = [15, 7, 1];
const INTERNAL_TASK_DAY_OFFSET = 15;

/** Rolls statuses, then enqueues T-15/T-7/T-1 client reminders and a T-15 internal task (spec 4.6). */
export async function runComplianceNightlyJob(now: Date = new Date()): Promise<void> {
  const rollover = await rollComplianceStatuses(now);
  logger.info(rollover, "compliance: nightly status rollover complete");

  for (const daysUntilDue of REMINDER_DAY_OFFSETS) {
    const items = await getItemsDueInDays(daysUntilDue, now);
    for (const item of items) {
      await enqueueComplianceReminder({
        complianceItemId: item.id,
        clientId: item.client.id,
        clientName: item.client.name,
        clientPhone: item.client.phone,
        clientEmail: item.client.email,
        whatsappOptedOut: item.client.whatsappOptedOut,
        title: item.title,
        dueDate: item.dueDate.toISOString(),
        daysUntilDue,
      });

      if (daysUntilDue === INTERNAL_TASK_DAY_OFFSET && item.client.assignedTo) {
        await enqueueComplianceInternalTask({
          complianceItemId: item.id,
          assignedTo: item.client.assignedTo,
          title: item.title,
          dueDate: item.dueDate.toISOString(),
        });
      }
    }
  }
}

export async function registerComplianceCron(): Promise<void> {
  const boss = await getBoss();
  await boss.createQueue(COMPLIANCE_NIGHTLY_JOB);
  await boss.schedule(COMPLIANCE_NIGHTLY_JOB, "0 2 * * *", {}, { tz: env.TZ_DISPLAY });

  await boss.work(COMPLIANCE_NIGHTLY_JOB, async () => {
    await runComplianceNightlyJob();
  });
}
