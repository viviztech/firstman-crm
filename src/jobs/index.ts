import { registerLeadNotificationJobs } from "@/jobs/lead-notifications";
import { registerOrderNotificationJobs } from "@/jobs/order-notifications";
import { logger } from "@/lib/logger";
import { getBoss } from "@/lib/queue";

/**
 * Registers all pg-boss workers and cron schedules. Called once from
 * instrumentation.ts on server boot. Individual job handlers land in
 * later phases (compliance reminders, WhatsApp sends, digests, ...).
 */
export async function registerJobs(): Promise<void> {
  await getBoss();
  await registerLeadNotificationJobs();
  await registerOrderNotificationJobs();
  logger.info("pg-boss started, lead + order notification workers registered");
}
