import { notifyEmail } from "@/jobs/notify";
import { getAppUrl } from "@/lib/app-url";
import { logger } from "@/lib/logger";
import { getBoss } from "@/lib/queue";
import { getEnquiryForNotification } from "@/services/enquiries";

export const ENQUIRY_ASSIGNED_JOB = "enquiry-assigned";

type EnquiryAssignedPayload = { enquiryId: string; assignedTo: string };

/** Never call the WhatsApp/notification API inline — always enqueue (spec 4.8). */
export async function enqueueEnquiryAssignedNotification(
  payload: EnquiryAssignedPayload,
): Promise<void> {
  const boss = await getBoss();
  await boss.send(ENQUIRY_ASSIGNED_JOB, payload);
}

export async function registerEnquiryNotificationJobs(): Promise<void> {
  const boss = await getBoss();
  await boss.createQueue(ENQUIRY_ASSIGNED_JOB);

  await boss.work<EnquiryAssignedPayload>(ENQUIRY_ASSIGNED_JOB, async (jobs) => {
    for (const job of jobs) {
      const enquiry = await getEnquiryForNotification(job.data.enquiryId);
      if (!enquiry?.assignee) {
        logger.warn(
          job.data,
          "enquiry-assigned notification: enquiry or assignee not found, skipping",
        );
        continue;
      }

      // Staff have no phone number on file in this data model — internal notifications go by email only.
      await notifyEmail({
        to: enquiry.assignee.email,
        subject: `New enquiry assigned: ${enquiry.name}`,
        heading: "A new enquiry has been assigned to you",
        lines: [
          `${enquiry.name} (${enquiry.phone}) has been assigned to you.`,
          "Follow up as soon as you can.",
        ],
        ctaLabel: "View enquiry",
        ctaUrl: getAppUrl(`/enquiries/${enquiry.id}`),
        template: "enquiry_assigned",
        entityType: "enquiry",
        entityId: enquiry.id,
      });
    }
  });
}
