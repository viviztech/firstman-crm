"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, toScope } from "@/actions/shared";
import type { Role } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { LEAD_AUTO_ASSIGNMENT_KEY } from "@/services/leads";
import { setSetting } from "@/services/settings";

const CAN_MANAGE_SETTINGS: Role[] = ["super_admin", "manager"];

export async function updateLeadAutoAssignmentAction(enabled: boolean): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_MANAGE_SETTINGS.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to change settings." };
  }

  await setSetting(LEAD_AUTO_ASSIGNMENT_KEY, enabled, toScope(currentUser));
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}
