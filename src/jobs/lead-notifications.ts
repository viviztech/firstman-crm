import { notifyEmail } from "@/jobs/notify";
import { getAppUrl } from "@/lib/app-url";
import { logger } from "@/lib/logger";
import { getBoss } from "@/lib/queue";
import { getLeadForNotification } from "@/services/leads";

export const LEAD_ASSIGNED_JOB = "lead-assigned";

type LeadAssignedPayload = { leadId: string; assignedTo: string };

/** Never call the WhatsApp/notification API inline — always enqueue (spec 4.8). */
export async function enqueueLeadAssignedNotification(payload: LeadAssignedPayload): Promise<void> {
  const boss = await getBoss();
  await boss.send(LEAD_ASSIGNED_JOB, payload);
}

export async function registerLeadNotificationJobs(): Promise<void> {
  const boss = await getBoss();
  await boss.createQueue(LEAD_ASSIGNED_JOB);

  await boss.work<LeadAssignedPayload>(LEAD_ASSIGNED_JOB, async (jobs) => {
    for (const job of jobs) {
      const lead = await getLeadForNotification(job.data.leadId);
      if (!lead?.assignee) {
        logger.warn(job.data, "lead-assigned notification: lead or assignee not found, skipping");
        continue;
      }

      // Staff have no phone number on file in this data model — internal notifications go by email only.
      await notifyEmail({
        to: lead.assignee.email,
        subject: `New lead assigned: ${lead.name}`,
        heading: "A new lead has been assigned to you",
        lines: [
          `${lead.name} (${lead.phone}) has been assigned to you.`,
          "Follow up as soon as you can.",
        ],
        ctaLabel: "View lead",
        ctaUrl: getAppUrl(`/leads/${lead.id}`),
        template: "lead_assigned",
        entityType: "lead",
        entityId: lead.id,
      });
    }
  });
}
