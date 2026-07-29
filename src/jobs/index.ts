import { logger } from "@/lib/logger";
import { getBoss } from "@/lib/queue";

/**
 * Registers all pg-boss workers and cron schedules. Called once from
 * instrumentation.ts on server boot. Individual job handlers land in
 * later phases (compliance reminders, WhatsApp sends, digests, ...).
 */
export async function registerJobs(): Promise<void> {
  const boss = await getBoss();
  logger.info("pg-boss started, no workers registered yet");
  void boss;
}
