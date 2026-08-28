import { formatInTimeZone } from "date-fns-tz";
import { notifyEmail } from "@/jobs/notify";
import { getAppUrl } from "@/lib/app-url";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { formatMoney } from "@/lib/money";
import { getBoss } from "@/lib/queue";
import { getInvoicePdfUrl } from "@/lib/signed-url";
import { getProformaInvoicesForNotification } from "@/services/invoices";
import { recordMessageLog } from "@/services/message-log";
import { sendWhatsAppDocument } from "@/services/whatsapp";

export const SALE_PROFORMA_ISSUED_JOB = "sale-proforma-issued";

type SaleProformaIssuedPayload = { clientId: string; proformaInvoiceIds: string[] };

/** Never call the WhatsApp/email API inline — always enqueue (spec 4.8). */
export async function enqueueSaleProformaIssuedNotification(
  payload: SaleProformaIssuedPayload,
): Promise<void> {
  const boss = await getBoss();
  await boss.send(SALE_PROFORMA_ISSUED_JOB, payload);
}

/** The actual per-event work — factored out so tests can call it directly, without round-tripping through pg-boss's async worker dispatch. */
export async function processSaleProformaIssuedJob(
  payload: SaleProformaIssuedPayload,
): Promise<void> {
  const proformas = await getProformaInvoicesForNotification(payload.proformaInvoiceIds);
  if (proformas.length === 0) {
    logger.warn(payload, "sale-proforma-issued notification: no proformas found, skipping");
    return;
  }

  const client = proformas[0]?.client;
  if (!client) return;

  // One WhatsApp document per proforma — WhatsApp naturally sends one discrete document per
  // message, unlike email which can list all of them in one place (see the combined email below).
  for (const proforma of proformas) {
    const pdfUrl = getAppUrl(getInvoicePdfUrl(proforma.id));
    if (client.whatsappOptedOut) {
      await recordMessageLog({
        channel: "whatsapp",
        to: client.phone,
        template: "sale_proforma_issued",
        status: "skipped",
        entityType: "invoice",
        entityId: proforma.id,
      });
      continue;
    }

    const result = await sendWhatsAppDocument({
      to: client.phone,
      documentUrl: pdfUrl,
      filename: `${proforma.invoiceNo}.pdf`,
      caption: `Proforma ${proforma.invoiceNo} — ${formatMoney(proforma.totalPaise)}`,
    });
    await recordMessageLog({
      channel: "whatsapp",
      to: client.phone,
      template: "sale_proforma_issued",
      payload: { pdfUrl },
      status: result.ok ? "sent" : "failed",
      error: result.ok ? undefined : result.error,
      entityType: "invoice",
      entityId: proforma.id,
    });
  }

  // One combined email for the whole sale — sendNotificationEmail supports one heading/CTA,
  // not a repeating per-invoice block, so N services get one email with N summary lines
  // rather than N near-identical emails landing in the same second.
  await notifyEmail({
    to: client.email,
    subject: "Your order with FirstMan Corporate Services",
    heading: "Here's your order summary",
    lines: proformas.map(
      (proforma) =>
        `${proforma.order?.orderNo ?? proforma.invoiceNo} — Proforma ${proforma.invoiceNo} — ${formatMoney(proforma.totalPaise)}, due ${formatInTimeZone(proforma.dueDate, env.TZ_DISPLAY, "d MMM yyyy")}`,
    ),
    ctaLabel: "Download your invoice",
    ctaUrl: getAppUrl(getInvoicePdfUrl(proformas[0]?.id ?? "")),
    template: "sale_proforma_issued",
    entityType: "client",
    entityId: client.id,
  });
}

export async function registerSaleProformaNotificationJobs(): Promise<void> {
  const boss = await getBoss();
  await boss.createQueue(SALE_PROFORMA_ISSUED_JOB);

  await boss.work<SaleProformaIssuedPayload>(SALE_PROFORMA_ISSUED_JOB, async (jobs) => {
    for (const job of jobs) {
      await processSaleProformaIssuedJob(job.data);
    }
  });
}
