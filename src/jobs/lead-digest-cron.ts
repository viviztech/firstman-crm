import { formatInTimeZone } from "date-fns-tz";
import { notifyEmail } from "@/jobs/notify";
import { getAppUrl } from "@/lib/app-url";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getBoss } from "@/lib/queue";
import { listFollowUpsDueForExecutive } from "@/services/leads";
import { listExecutives } from "@/services/users";

export const LEAD_FOLLOWUP_DIGEST_JOB = "lead-followup-digest";

/** Morning digest per executive: their leads with a follow-up due today or overdue (spec 4.8). */
export async function runLeadFollowupDigestJob(now: Date = new Date()): Promise<void> {
  const executives = await listExecutives();

  for (const executive of executives) {
    const dueLeads = await listFollowUpsDueForExecutive(executive.id, now);
    if (dueLeads.length === 0) continue;

    await notifyEmail({
      to: executive.email,
      subject: `${dueLeads.length} follow-up${dueLeads.length === 1 ? "" : "s"} due today`,
      heading: "Today's follow-ups",
      lines: dueLeads.map(
        (lead) =>
          `${lead.name} (${lead.phone}) — due ${
            lead.nextFollowUpAt
              ? formatInTimeZone(lead.nextFollowUpAt, env.TZ_DISPLAY, "d MMM, h:mm a")
              : "today"
          }`,
      ),
      ctaLabel: "View leads",
      ctaUrl: getAppUrl("/leads"),
      template: "lead_followup_digest",
      entityType: "digest",
    });
  }

  logger.info({ executiveCount: executives.length }, "lead follow-up digest: run complete");
}

export async function registerLeadDigestCron(): Promise<void> {
  const boss = await getBoss();
  await boss.createQueue(LEAD_FOLLOWUP_DIGEST_JOB);
  await boss.schedule(LEAD_FOLLOWUP_DIGEST_JOB, "0 9 * * *", {}, { tz: env.TZ_DISPLAY });

  await boss.work(LEAD_FOLLOWUP_DIGEST_JOB, async () => {
    await runLeadFollowupDigestJob();
  });
}
