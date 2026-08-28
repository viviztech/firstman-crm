import { env } from "@/lib/env";
import { getBoss } from "@/lib/queue";
import { listOverdueTasksForNotification } from "@/services/analytics";
import { createNotification, hasUnreadNotificationFor } from "@/services/notifications";

export const TASK_OVERDUE_JOB = "task-overdue-notification";

/**
 * Periodic scan for newly-overdue job-card tasks — replaces the old topbar bell's live
 * "what's overdue right now" query with a real, persisted notification per (task, assignee).
 * Dedupe-guarded so an already-notified, still-unread task doesn't spam a fresh row every tick.
 */
export async function runTaskOverdueNotificationJob(now: Date = new Date()): Promise<void> {
  const overdueTasks = await listOverdueTasksForNotification(now);

  for (const task of overdueTasks) {
    if (!task.assignedTo) continue;

    const alreadyNotified = await hasUnreadNotificationFor({
      userId: task.assignedTo,
      type: "task_overdue",
      entityType: "order_task",
      entityId: task.id,
    });
    if (alreadyNotified) continue;

    await createNotification({
      userId: task.assignedTo,
      type: "task_overdue",
      title: `Overdue: ${task.title}`,
      body: task.order.orderNo,
      href: `/orders/${task.order.id}`,
      entityType: "order_task",
      entityId: task.id,
    });
  }
}

export async function registerTaskOverdueCron(): Promise<void> {
  const boss = await getBoss();
  await boss.createQueue(TASK_OVERDUE_JOB);
  await boss.schedule(TASK_OVERDUE_JOB, "0 * * * *", {}, { tz: env.TZ_DISPLAY });

  await boss.work(TASK_OVERDUE_JOB, async () => {
    await runTaskOverdueNotificationJob();
  });
}
