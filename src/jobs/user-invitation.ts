import { notifyEmail } from "@/jobs/notify";
import { getAppUrl } from "@/lib/app-url";
import { getBoss } from "@/lib/queue";

export const USER_INVITED_JOB = "user-invited";

type UserInvitedPayload = { userId: string; email: string; name: string; tempPassword: string };

/** Never call the email API inline — always enqueue (spec 4.8). */
export async function enqueueUserInvitedEmail(payload: UserInvitedPayload): Promise<void> {
  const boss = await getBoss();
  await boss.send(USER_INVITED_JOB, payload);
}

export async function registerUserInvitationJobs(): Promise<void> {
  const boss = await getBoss();
  await boss.createQueue(USER_INVITED_JOB);

  await boss.work<UserInvitedPayload>(USER_INVITED_JOB, async (jobs) => {
    for (const job of jobs) {
      await notifyEmail({
        to: job.data.email,
        subject: "You've been added to FirstMan CRM",
        heading: `Welcome, ${job.data.name}`,
        lines: [
          "An account has been created for you on FirstMan CRM.",
          `Email: ${job.data.email}`,
          `Temporary password: ${job.data.tempPassword}`,
          "Please sign in and change your password as soon as possible.",
        ],
        ctaLabel: "Sign in",
        ctaUrl: getAppUrl("/login"),
        template: "user_invited",
        // No entityId: better-auth's user.id is its own alphanumeric ID format, not a UUID,
        // and message_logs.entity_id is a strict uuid column (every other entity type here
        // uses uuid v7 primary keys) — passing it through fails the insert outright.
        entityType: "user",
      });
    }
  });
}
