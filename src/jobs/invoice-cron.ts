import { enqueueOverdueInvoicesDigest } from "@/jobs/invoice-notifications";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getBoss } from "@/lib/queue";
import {
  getOverdueInvoicesForDigest,
  getOverdueInvoicesTotalPaise,
  rollInvoiceStatusesOverdue,
} from "@/services/invoices";

export const INVOICE_NIGHTLY_JOB = "invoice-nightly-rollover";

/** Rolls sent/partially_paid invoices past their due date to overdue, then enqueues the daily digest (spec 4.7). */
export async function runInvoiceNightlyJob(now: Date = new Date()): Promise<void> {
  const rollover = await rollInvoiceStatusesOverdue(now);
  logger.info(rollover, "invoices: nightly overdue rollover complete");

  const overdueInvoices = await getOverdueInvoicesForDigest();
  if (overdueInvoices.length === 0) return;

  const totalOutstandingPaise = await getOverdueInvoicesTotalPaise();
  await enqueueOverdueInvoicesDigest({
    count: overdueInvoices.length,
    totalOutstandingPaise,
  });
}

export async function registerInvoiceCron(): Promise<void> {
  const boss = await getBoss();
  await boss.createQueue(INVOICE_NIGHTLY_JOB);
  await boss.schedule(INVOICE_NIGHTLY_JOB, "0 3 * * *", {}, { tz: env.TZ_DISPLAY });

  await boss.work(INVOICE_NIGHTLY_JOB, async () => {
    await runInvoiceNightlyJob();
  });
}
