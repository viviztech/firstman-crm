import { notifyClientWhatsApp, notifyEmail } from "@/jobs/notify";
import { getAppUrl } from "@/lib/app-url";
import { logger } from "@/lib/logger";
import { getBoss } from "@/lib/queue";
import { getOrderForNotification } from "@/services/orders";

export const ORDER_STATUS_CHANGED_JOB = "order-status-changed";

type OrderStatusChangedPayload = { orderId: string; orderNo: string; status: string };

/** Never call the WhatsApp/email API inline — always enqueue (spec 4.4, 4.8). */
export async function enqueueOrderStatusChangedNotification(
  payload: OrderStatusChangedPayload,
): Promise<void> {
  const boss = await getBoss();
  await boss.send(ORDER_STATUS_CHANGED_JOB, payload);
}

export async function registerOrderNotificationJobs(): Promise<void> {
  const boss = await getBoss();
  await boss.createQueue(ORDER_STATUS_CHANGED_JOB);

  await boss.work<OrderStatusChangedPayload>(ORDER_STATUS_CHANGED_JOB, async (jobs) => {
    for (const job of jobs) {
      const order = await getOrderForNotification(job.data.orderId);
      if (!order) {
        logger.warn(job.data, "order-status-changed notification: order not found, skipping");
        continue;
      }

      await notifyClientWhatsApp({
        phone: order.client.phone,
        whatsappOptedOut: order.client.whatsappOptedOut,
        eventKey: "order_status_changed",
        bodyParams: [order.client.name, order.orderNo, job.data.status],
        entityType: "order",
        entityId: order.id,
      });

      await notifyEmail({
        to: order.client.email,
        subject: `Update on your order ${order.orderNo}`,
        heading: "Your order status has changed",
        lines: [`Order ${order.orderNo} is now: ${job.data.status.replace(/_/g, " ")}.`],
        ctaLabel: "View order",
        ctaUrl: getAppUrl(`/orders/${order.id}`),
        template: "order_status_changed",
        entityType: "order",
        entityId: order.id,
      });
    }
  });
}
