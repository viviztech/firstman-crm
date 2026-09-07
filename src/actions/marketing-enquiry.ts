"use server";

import { type ActionResult, firstIssueMessage } from "@/actions/shared";
import { enqueueEnquiryAssignedNotification } from "@/jobs/enquiry-notifications";
import { enqueueEnquiryQuoteIssuedNotification } from "@/jobs/enquiry-quote-notifications";
import { enqueueMarketingEnquiryReceivedNotification } from "@/jobs/marketing-enquiry-notifications";
import {
  createEnquiry,
  DuplicateEnquiryPhoneError,
  findEnquiryIdByPhone,
  mergeDuplicateEnquirySubmission,
  publicEnquiryInputSchema,
} from "@/services/enquiries";

/**
 * The public site's own form fields — `source` is fixed server-side to "website" rather
 * than trusted from the client, and this is a same-process Server Action (not the bearer-
 * token `POST /api/v1/enquiries` route), since that endpoint exists for external sites, not
 * marketing pages living in this same app. Not exported: a "use server" file may only
 * export async functions.
 */
const marketingEnquiryFormSchema = publicEnquiryInputSchema.omit({
  source: true,
  nextFollowUpAt: true,
});

export async function submitMarketingEnquiryAction(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const parsed = marketingEnquiryFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  let created: Awaited<ReturnType<typeof createEnquiry>>;
  try {
    created = await createEnquiry({ ...parsed.data, source: "website" }, null);
  } catch (error) {
    // Someone already on file re-submitting (spec 4.1's phone is unique) isn't a failure from
    // their point of view — show the same thank-you as a fresh submission. Rather than silently
    // dropping the resubmission, merge in whatever new details it carries (they may be back to
    // fill in the email/state/directors/capital they skipped the first time, expecting an
    // accurate quote out of it) and re-issue the quote if there's now a service to quote.
    if (error instanceof DuplicateEnquiryPhoneError) {
      const existingId = await findEnquiryIdByPhone(error.phone);
      if (existingId) {
        const merged = await mergeDuplicateEnquirySubmission(existingId, parsed.data);
        if (merged?.serviceInterestedId) {
          await enqueueEnquiryQuoteIssuedNotification({ enquiryId: merged.id });
        }
      }
      return { ok: true, data: { id: existingId ?? "" } };
    }
    throw error;
  }

  if (created.assignedTo) {
    await enqueueEnquiryAssignedNotification({
      enquiryId: created.id,
      assignedTo: created.assignedTo,
    });
  }
  await enqueueMarketingEnquiryReceivedNotification({
    enquiryId: created.id,
    name: created.name,
    phone: created.phone,
  });
  if (created.serviceInterestedId) {
    await enqueueEnquiryQuoteIssuedNotification({ enquiryId: created.id });
  }

  return { ok: true, data: { id: created.id } };
}
