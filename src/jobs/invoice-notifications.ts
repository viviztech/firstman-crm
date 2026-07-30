import { logger } from "@/lib/logger";
import { getBoss } from "@/lib/queue";

export const INVOICE_SENT_JOB = "invoice-sent";
export const PAYMENT_RECEIVED_JOB = "payment-received";
export const OVERDUE_INVOICES_DIGEST_JOB = "overdue-invoices-digest";

type InvoiceSentPayload = { invoiceId: string; invoiceNo: string; clientId: string };

type PaymentReceivedPayload = {
  invoiceId: string;
  invoiceNo: string;
  clientId: string;
  amountPaise: number;
};

type OverdueInvoicesDigestPayload = {
  count: number;
  totalOutstandingPaise: number;
};

/** Never call the WhatsApp/email API inline — always enqueue (spec 4.7, 4.8). */
export async function enqueueInvoiceSentNotification(payload: InvoiceSentPayload): Promise<void> {
  const boss = await getBoss();
  await boss.send(INVOICE_SENT_JOB, payload);
}

export async function enqueuePaymentReceivedNotification(
  payload: PaymentReceivedPayload,
): Promise<void> {
  const boss = await getBoss();
  await boss.send(PAYMENT_RECEIVED_JOB, payload);
}

export async function enqueueOverdueInvoicesDigest(
  payload: OverdueInvoicesDigestPayload,
): Promise<void> {
  const boss = await getBoss();
  await boss.send(OVERDUE_INVOICES_DIGEST_JOB, payload);
}

export async function registerInvoiceNotificationJobs(): Promise<void> {
  const boss = await getBoss();
  await boss.createQueue(INVOICE_SENT_JOB);
  await boss.createQueue(PAYMENT_RECEIVED_JOB);
  await boss.createQueue(OVERDUE_INVOICES_DIGEST_JOB);

  await boss.work<InvoiceSentPayload>(INVOICE_SENT_JOB, async (jobs) => {
    for (const job of jobs) {
      // WHATSAPP_TOKEN is empty in dev, so this stays a log-only driver (spec 4.8).
      // Phase 7 replaces this body with real WhatsApp + email sends + message_logs rows.
      logger.info(
        {
          invoiceId: job.data.invoiceId,
          invoiceNo: job.data.invoiceNo,
          clientId: job.data.clientId,
        },
        "notification: invoice sent (WhatsApp+email send stub)",
      );
    }
  });

  await boss.work<PaymentReceivedPayload>(PAYMENT_RECEIVED_JOB, async (jobs) => {
    for (const job of jobs) {
      logger.info(
        {
          invoiceId: job.data.invoiceId,
          invoiceNo: job.data.invoiceNo,
          clientId: job.data.clientId,
          amountPaise: job.data.amountPaise,
        },
        "notification: payment received (WhatsApp+email send stub)",
      );
    }
  });

  await boss.work<OverdueInvoicesDigestPayload>(OVERDUE_INVOICES_DIGEST_JOB, async (jobs) => {
    for (const job of jobs) {
      logger.info(
        { count: job.data.count, totalOutstandingPaise: job.data.totalOutstandingPaise },
        "notification: overdue invoices digest to accountant+manager (email send stub)",
      );
    }
  });
}
