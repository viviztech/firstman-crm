import { registerComplianceCron } from "@/jobs/compliance-cron";
import { registerComplianceNotificationJobs } from "@/jobs/compliance-notifications";
import { registerInvoiceCron } from "@/jobs/invoice-cron";
import { registerInvoiceNotificationJobs } from "@/jobs/invoice-notifications";
import { registerLeadNotificationJobs } from "@/jobs/lead-notifications";
import { registerOrderNotificationJobs } from "@/jobs/order-notifications";
import { logger } from "@/lib/logger";
import { getBoss } from "@/lib/queue";

/**
 * Registers all pg-boss workers and cron schedules. Called once from
 * instrumentation.ts on server boot. Individual job handlers land in
 * later phases (WhatsApp sends, digests, ...).
 */
export async function registerJobs(): Promise<void> {
  await getBoss();
  await registerLeadNotificationJobs();
  await registerOrderNotificationJobs();
  await registerComplianceNotificationJobs();
  await registerComplianceCron();
  await registerInvoiceNotificationJobs();
  await registerInvoiceCron();
  logger.info("pg-boss started, notification workers + compliance + invoice cron registered");
}
