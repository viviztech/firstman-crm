import { registerComplianceCron } from "@/jobs/compliance-cron";
import { registerComplianceNotificationJobs } from "@/jobs/compliance-notifications";
import { registerDocsPendingCron } from "@/jobs/docs-pending-cron";
import { registerEnquiryDigestCron } from "@/jobs/enquiry-digest-cron";
import { registerEnquiryNotificationJobs } from "@/jobs/enquiry-notifications";
import { registerInvoiceCron } from "@/jobs/invoice-cron";
import { registerInvoiceNotificationJobs } from "@/jobs/invoice-notifications";
import { registerMarketingEnquiryNotificationJobs } from "@/jobs/marketing-enquiry-notifications";
import { registerOrderNotificationJobs } from "@/jobs/order-notifications";
import { registerUserInvitationJobs } from "@/jobs/user-invitation";
import { logger } from "@/lib/logger";
import { getBoss } from "@/lib/queue";

/**
 * Registers all pg-boss workers and cron schedules. Called once from
 * instrumentation.ts on server boot.
 */
export async function registerJobs(): Promise<void> {
  await getBoss();
  await registerEnquiryNotificationJobs();
  await registerMarketingEnquiryNotificationJobs();
  await registerOrderNotificationJobs();
  await registerComplianceNotificationJobs();
  await registerComplianceCron();
  await registerInvoiceNotificationJobs();
  await registerInvoiceCron();
  await registerEnquiryDigestCron();
  await registerDocsPendingCron();
  await registerUserInvitationJobs();
  logger.info(
    "pg-boss started, notification workers + compliance/invoice/enquiry-digest/docs-pending cron registered",
  );
}
