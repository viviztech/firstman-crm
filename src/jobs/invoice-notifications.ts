import { notifyClientWhatsApp, notifyEmail } from "@/jobs/notify";
import { getAppUrl } from "@/lib/app-url";
import { logger } from "@/lib/logger";
import { formatMoney } from "@/lib/money";
import { getBoss } from "@/lib/queue";
import { getInvoicePdfUrl } from "@/lib/signed-url";
import { getInvoiceForNotification } from "@/services/invoices";
import { recordMessageLog } from "@/services/message-log";
import { listStaffEmailsByRole } from "@/services/users";
import { sendWhatsAppDocument } from "@/services/whatsapp";

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
      const invoice = await getInvoiceForNotification(job.data.invoiceId);
      if (!invoice) {
        logger.warn(job.data, "invoice-sent notification: invoice not found, skipping");
        continue;
      }

      const pdfUrl = getAppUrl(getInvoicePdfUrl(invoice.id));

      // Spec 4.7: "Send invoice via email + WhatsApp (signed PDF link)" — a document send, not just text.
      if (invoice.client.whatsappOptedOut) {
        await recordMessageLog({
          channel: "whatsapp",
          to: invoice.client.phone,
          template: "invoice_sent",
          status: "skipped",
          entityType: "invoice",
          entityId: invoice.id,
        });
      } else {
        const result = await sendWhatsAppDocument({
          to: invoice.client.phone,
          documentUrl: pdfUrl,
          filename: `${invoice.invoiceNo}.pdf`,
          caption: `Invoice ${invoice.invoiceNo} — ${formatMoney(invoice.totalPaise)}`,
        });
        await recordMessageLog({
          channel: "whatsapp",
          to: invoice.client.phone,
          template: "invoice_sent",
          payload: { pdfUrl },
          status: result.ok ? "sent" : "failed",
          error: result.ok ? undefined : result.error,
          entityType: "invoice",
          entityId: invoice.id,
        });
      }

      await notifyEmail({
        to: invoice.client.email,
        subject: `Invoice ${invoice.invoiceNo} from FirstMan Corporate Services`,
        heading: "Your invoice is ready",
        lines: [`Invoice ${invoice.invoiceNo} for ${formatMoney(invoice.totalPaise)} is attached.`],
        ctaLabel: "Download invoice PDF",
        ctaUrl: pdfUrl,
        template: "invoice_sent",
        entityType: "invoice",
        entityId: invoice.id,
      });
    }
  });

  await boss.work<PaymentReceivedPayload>(PAYMENT_RECEIVED_JOB, async (jobs) => {
    for (const job of jobs) {
      const invoice = await getInvoiceForNotification(job.data.invoiceId);
      if (!invoice) {
        logger.warn(job.data, "payment-received notification: invoice not found, skipping");
        continue;
      }

      await notifyClientWhatsApp({
        phone: invoice.client.phone,
        whatsappOptedOut: invoice.client.whatsappOptedOut,
        eventKey: "payment_received",
        bodyParams: [invoice.client.name, invoice.invoiceNo, formatMoney(job.data.amountPaise)],
        entityType: "invoice",
        entityId: invoice.id,
      });

      await notifyEmail({
        to: invoice.client.email,
        subject: `Payment received for invoice ${invoice.invoiceNo}`,
        heading: "Thank you for your payment",
        lines: [
          `We've received ${formatMoney(job.data.amountPaise)} against invoice ${invoice.invoiceNo}.`,
        ],
        ctaLabel: "View invoice",
        ctaUrl: getAppUrl(`/invoices/${invoice.id}`),
        template: "payment_received",
        entityType: "invoice",
        entityId: invoice.id,
      });
    }
  });

  await boss.work<OverdueInvoicesDigestPayload>(OVERDUE_INVOICES_DIGEST_JOB, async (jobs) => {
    for (const job of jobs) {
      const recipients = await listStaffEmailsByRole(["manager", "accountant"]);
      for (const to of recipients) {
        await notifyEmail({
          to,
          subject: `${job.data.count} overdue invoice${job.data.count === 1 ? "" : "s"}`,
          heading: "Overdue invoices digest",
          lines: [
            `${job.data.count} invoice${job.data.count === 1 ? " is" : "s are"} now overdue, totalling ${formatMoney(job.data.totalOutstandingPaise)}.`,
          ],
          ctaLabel: "View invoices",
          ctaUrl: getAppUrl("/invoices?status=overdue"),
          template: "overdue_invoices_digest",
          entityType: "digest",
        });
      }
    }
  });
}
