"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, firstIssueMessage, toScope } from "@/actions/shared";
import type { Role } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import {
  setStaffPincodes,
  setStaffServiceAssignments,
  staffEmployeeTypeInputSchema,
  staffPincodesInputSchema,
  staffServiceAssignmentsInputSchema,
  updateStaffEmployeeType,
} from "@/services/staff";

const CAN_MANAGE: Role[] = ["super_admin", "manager"];

export async function updateStaffEmployeeTypeAction(
  userId: string,
  employeeType: string,
): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_MANAGE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to manage staff." };
  }

  const parsed = staffEmployeeTypeInputSchema.safeParse({ employeeType });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  await updateStaffEmployeeType(userId, parsed.data.employeeType, await toScope(currentUser));
  revalidatePath("/settings/users");
  return { ok: true, data: undefined };
}

export async function updateStaffPincodesAction(
  userId: string,
  pincodes: string[],
): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_MANAGE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to manage staff." };
  }

  const parsed = staffPincodesInputSchema.safeParse({ pincodes });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  await setStaffPincodes(userId, parsed.data.pincodes, await toScope(currentUser));
  revalidatePath("/settings/users");
  return { ok: true, data: undefined };
}

export async function updateStaffServiceAssignmentsAction(
  userId: string,
  serviceIds: string[],
): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_MANAGE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to manage staff." };
  }

  const parsed = staffServiceAssignmentsInputSchema.safeParse({ serviceIds });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  await setStaffServiceAssignments(userId, parsed.data.serviceIds, await toScope(currentUser));
  revalidatePath("/settings/users");
  return { ok: true, data: undefined };
}
