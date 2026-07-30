import { notifyClientWhatsApp, notifyEmail } from "@/jobs/notify";
import { getAppUrl } from "@/lib/app-url";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getBoss } from "@/lib/queue";
import { listOrdersWithPendingDocs } from "@/services/orders";

export const DOCS_PENDING_REMINDER_JOB = "docs-pending-reminder";

/** Weekly reminder to clients with an open order still missing documents (spec 4.8). */
export async function runDocsPendingReminderJob(): Promise<void> {
  const orders = await listOrdersWithPendingDocs();

  for (const order of orders) {
    await notifyClientWhatsApp({
      phone: order.client.phone,
      whatsappOptedOut: order.client.whatsappOptedOut,
      eventKey: "docs_pending_reminder",
      bodyParams: [order.client.name, order.orderNo],
      entityType: "order",
      entityId: order.id,
    });

    await notifyEmail({
      to: order.client.email,
      subject: `Documents still pending for order ${order.orderNo}`,
      heading: "A few documents are still pending",
      lines: [
        `Order ${order.orderNo} is waiting on some documents from your side.`,
        "Please upload them at your earliest convenience so we can keep things moving.",
      ],
      ctaLabel: "View order",
      ctaUrl: getAppUrl(`/orders/${order.id}`),
      template: "docs_pending_reminder",
      entityType: "order",
      entityId: order.id,
    });
  }

  logger.info({ orderCount: orders.length }, "docs-pending reminder: run complete");
}

export async function registerDocsPendingCron(): Promise<void> {
  const boss = await getBoss();
  await boss.createQueue(DOCS_PENDING_REMINDER_JOB);
  await boss.schedule(DOCS_PENDING_REMINDER_JOB, "0 10 * * 1", {}, { tz: env.TZ_DISPLAY });

  await boss.work(DOCS_PENDING_REMINDER_JOB, async () => {
    await runDocsPendingReminderJob();
  });
}
