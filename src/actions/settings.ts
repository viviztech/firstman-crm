"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, toScope } from "@/actions/shared";
import type { Role } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { ENQUIRY_AUTO_ASSIGNMENT_KEY } from "@/services/enquiries";
import { setSetting } from "@/services/settings";

const CAN_MANAGE_SETTINGS: Role[] = ["super_admin", "manager"];

export async function updateEnquiryAutoAssignmentAction(enabled: boolean): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_MANAGE_SETTINGS.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to change settings." };
  }

  await setSetting(ENQUIRY_AUTO_ASSIGNMENT_KEY, enabled, await toScope(currentUser));
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}
