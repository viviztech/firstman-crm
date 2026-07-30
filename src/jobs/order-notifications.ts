import { logger } from "@/lib/logger";
import { getBoss } from "@/lib/queue";

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
      // WHATSAPP_TOKEN is empty in dev, so this stays a log-only driver (spec 4.8).
      // Phase 7 replaces this body with real WhatsApp + email sends + message_logs rows.
      logger.info(
        { orderId: job.data.orderId, orderNo: job.data.orderNo, status: job.data.status },
        "notification: order status changed (WhatsApp+email send stub)",
      );
    }
  });
}
