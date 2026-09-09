"use server";

import { type ActionResult, firstIssueMessage } from "@/actions/shared";
import { enqueueQuoteRespondedNotification } from "@/jobs/quote-response-notifications";
import { verifyQuoteResponseToken } from "@/lib/signed-url";
import { respondToQuote, respondToQuoteInputSchema } from "@/services/quotes";

/**
 * Public action for the signed quote-response link sent by email/WhatsApp (Option A of the
 * quote-approval feature) — no session, no ActorScope. The token is the sole authorization,
 * same pattern as the PDF route handlers (spec 4.5).
 */
export async function respondToQuoteAction(
  quoteId: string,
  token: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  if (!verifyQuoteResponseToken(quoteId, token)) {
    return { ok: false, error: "This link has expired or is invalid." };
  }

  const parsed = respondToQuoteInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const updated = await respondToQuote(quoteId, parsed.data);
  if (!updated) {
    return { ok: false, error: "Quote not found." };
  }

  await enqueueQuoteRespondedNotification({ quoteId: updated.id });

  return { ok: true, data: undefined };
}
