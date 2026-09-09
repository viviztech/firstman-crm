"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, firstIssueMessage, toScope } from "@/actions/shared";
import { enqueueQuoteRevisedNotification } from "@/jobs/enquiry-quote-notifications";
import type { Role } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { reviseQuote, reviseQuoteInputSchema } from "@/services/quotes";

const CAN_ACCESS: Role[] = ["super_admin", "manager", "executive"];

/** Line items travel as a JSON blob in a hidden field — FormData has no native array encoding
 * (mirrors parseServiceLines in actions/enquiries.ts and parseLineItems in actions/invoices.ts). */
function parseLineItems(formData: FormData): unknown[] {
  const raw = formData.get("lineItemsJson");
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function reviseQuoteAction(
  quoteId: string,
  enquiryId: string,
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireUser();
  if (!CAN_ACCESS.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to edit quotations." };
  }

  const parsed = reviseQuoteInputSchema.safeParse({
    lineItems: parseLineItems(formData),
    gstRate: formData.get("gstRate"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const revised = await reviseQuote(quoteId, parsed.data, await toScope(currentUser));
  if (!revised) {
    return { ok: false, error: "Quote not found, or you do not have access to it." };
  }

  if (formData.get("sendToClient") === "true") {
    await enqueueQuoteRevisedNotification({ quoteId: revised.id });
  }

  revalidatePath(`/enquiries/${enquiryId}`);
  return { ok: true, data: { id: revised.id } };
}
