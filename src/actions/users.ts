"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, firstIssueMessage } from "@/actions/shared";
import { enqueueUserInvitedEmail } from "@/jobs/user-invitation";
import type { Role } from "@/lib/auth";
import { requireRole } from "@/lib/session";
import {
  changeUserRole,
  createStaffUser,
  inviteUserInputSchema,
  setUserBanned,
} from "@/lib/user-admin";

export async function inviteUserAction(
  _prev: ActionResult<{ id: string; email: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string; email: string }>> {
  await requireRole("super_admin");

  const parsed = inviteUserInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  try {
    const created = await createStaffUser(parsed.data);
    await enqueueUserInvitedEmail({
      userId: created.id,
      email: created.email,
      name: parsed.data.name,
      tempPassword: created.tempPassword,
    });
    revalidatePath("/settings/users");
    return { ok: true, data: { id: created.id, email: created.email } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create user.",
    };
  }
}

export async function changeUserRoleAction(userId: string, role: Role): Promise<ActionResult> {
  const actor = await requireRole("super_admin");

  try {
    await changeUserRole(userId, role, actor.id);
    revalidatePath("/settings/users");
    return { ok: true, data: undefined };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to change role.",
    };
  }
}

export async function setUserBannedAction(userId: string, banned: boolean): Promise<ActionResult> {
  const actor = await requireRole("super_admin");

  try {
    await setUserBanned(userId, banned, actor.id);
    revalidatePath("/settings/users");
    return { ok: true, data: undefined };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update account status.",
    };
  }
}
