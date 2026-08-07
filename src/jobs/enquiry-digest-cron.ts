import { formatInTimeZone } from "date-fns-tz";
import { notifyEmail } from "@/jobs/notify";
import { getAppUrl } from "@/lib/app-url";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getBoss } from "@/lib/queue";
import { listFollowUpsDueForExecutive } from "@/services/enquiries";
import { listExecutives } from "@/services/users";

export const ENQUIRY_FOLLOWUP_DIGEST_JOB = "enquiry-followup-digest";

/** Morning digest per executive: their enquiries with a follow-up due today or overdue (spec 4.8). */
export async function runEnquiryFollowupDigestJob(now: Date = new Date()): Promise<void> {
  const executives = await listExecutives();

  for (const executive of executives) {
    const dueEnquiries = await listFollowUpsDueForExecutive(executive.id, now);
    if (dueEnquiries.length === 0) continue;

    await notifyEmail({
      to: executive.email,
      subject: `${dueEnquiries.length} follow-up${dueEnquiries.length === 1 ? "" : "s"} due today`,
      heading: "Today's follow-ups",
      lines: dueEnquiries.map(
        (enquiry) =>
          `${enquiry.name} (${enquiry.phone}) — due ${
            enquiry.nextFollowUpAt
              ? formatInTimeZone(enquiry.nextFollowUpAt, env.TZ_DISPLAY, "d MMM, h:mm a")
              : "today"
          }`,
      ),
      ctaLabel: "View enquiries",
      ctaUrl: getAppUrl("/enquiries"),
      template: "enquiry_followup_digest",
      entityType: "digest",
    });
  }

  logger.info({ executiveCount: executives.length }, "enquiry follow-up digest: run complete");
}

export async function registerEnquiryDigestCron(): Promise<void> {
  const boss = await getBoss();
  await boss.createQueue(ENQUIRY_FOLLOWUP_DIGEST_JOB);
  await boss.schedule(ENQUIRY_FOLLOWUP_DIGEST_JOB, "0 9 * * *", {}, { tz: env.TZ_DISPLAY });

  await boss.work(ENQUIRY_FOLLOWUP_DIGEST_JOB, async () => {
    await runEnquiryFollowupDigestJob();
  });
}
