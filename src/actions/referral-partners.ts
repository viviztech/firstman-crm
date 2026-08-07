"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, firstIssueMessage, toScope } from "@/actions/shared";
import type { Role } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import {
  createReferralPartner,
  deleteReferralPartner,
  referralPartnerInputSchema,
  updateReferralPartner,
} from "@/services/referral-partners";

const CAN_MANAGE: Role[] = ["super_admin", "manager"];

export async function createReferralPartnerAction(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireUser();
  if (!CAN_MANAGE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to manage referral partners." };
  }

  const parsed = referralPartnerInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const created = await createReferralPartner(parsed.data, await toScope(currentUser));
  revalidatePath("/settings/referral-partners");
  return { ok: true, data: { id: created.id } };
}

export async function updateReferralPartnerAction(
  id: string,
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireUser();
  if (!CAN_MANAGE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to manage referral partners." };
  }

  const parsed = referralPartnerInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const updated = await updateReferralPartner(id, parsed.data, await toScope(currentUser));
  if (!updated) {
    return { ok: false, error: "Referral partner not found." };
  }

  revalidatePath("/settings/referral-partners");
  return { ok: true, data: { id: updated.id } };
}

export async function deleteReferralPartnerAction(id: string): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_MANAGE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to manage referral partners." };
  }

  const deleted = await deleteReferralPartner(id, await toScope(currentUser));
  if (!deleted) {
    return { ok: false, error: "Referral partner not found." };
  }

  revalidatePath("/settings/referral-partners");
  return { ok: true, data: undefined };
}
