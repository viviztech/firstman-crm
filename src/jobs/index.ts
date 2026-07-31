import { registerComplianceCron } from "@/jobs/compliance-cron";
import { registerComplianceNotificationJobs } from "@/jobs/compliance-notifications";
import { registerDocsPendingCron } from "@/jobs/docs-pending-cron";
import { registerInvoiceCron } from "@/jobs/invoice-cron";
import { registerInvoiceNotificationJobs } from "@/jobs/invoice-notifications";
import { registerLeadDigestCron } from "@/jobs/lead-digest-cron";
import { registerLeadNotificationJobs } from "@/jobs/lead-notifications";
import { registerMarketingLeadNotificationJobs } from "@/jobs/marketing-lead-notifications";
import { registerOrderNotificationJobs } from "@/jobs/order-notifications";
import { logger } from "@/lib/logger";
import { getBoss } from "@/lib/queue";

/**
 * Registers all pg-boss workers and cron schedules. Called once from
 * instrumentation.ts on server boot.
 */
export async function registerJobs(): Promise<void> {
  await getBoss();
  await registerLeadNotificationJobs();
  await registerMarketingLeadNotificationJobs();
  await registerOrderNotificationJobs();
  await registerComplianceNotificationJobs();
  await registerComplianceCron();
  await registerInvoiceNotificationJobs();
  await registerInvoiceCron();
  await registerLeadDigestCron();
  await registerDocsPendingCron();
  logger.info(
    "pg-boss started, notification workers + compliance/invoice/lead-digest/docs-pending cron registered",
  );
}
