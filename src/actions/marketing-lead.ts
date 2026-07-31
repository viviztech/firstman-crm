"use server";

import { type ActionResult, firstIssueMessage } from "@/actions/shared";
import { enqueueLeadAssignedNotification } from "@/jobs/lead-notifications";
import { enqueueMarketingLeadReceivedNotification } from "@/jobs/marketing-lead-notifications";
import { createLead, publicLeadInputSchema } from "@/services/leads";

/**
 * The public site's own form fields — `source` is fixed server-side to "website" rather
 * than trusted from the client, and this is a same-process Server Action (not the bearer-
 * token `POST /api/v1/leads` route), since that endpoint exists for external sites, not
 * marketing pages living in this same app. Not exported: a "use server" file may only
 * export async functions.
 */
const marketingLeadFormSchema = publicLeadInputSchema.omit({
  source: true,
  nextFollowUpAt: true,
});

export async function submitMarketingLeadAction(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const parsed = marketingLeadFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const created = await createLead({ ...parsed.data, source: "website" }, null);

  if (created.assignedTo) {
    await enqueueLeadAssignedNotification({ leadId: created.id, assignedTo: created.assignedTo });
  }
  await enqueueMarketingLeadReceivedNotification({
    leadId: created.id,
    name: created.name,
    phone: created.phone,
  });

  return { ok: true, data: { id: created.id } };
}
