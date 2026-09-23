"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, firstIssueMessage } from "@/actions/shared";
import { requireUser } from "@/lib/session";
import { assertHrCapability } from "@/services/hr";
import {
  addLeaveAdjustment,
  cancelLeaveRequest,
  createHoliday,
  createLeavePolicy,
  createLeaveRequest,
  createLeaveType,
  decideLeaveRequest,
  holidayInputSchema,
  leaveAdjustmentInputSchema,
  leavePolicyInputSchema,
  leaveRequestInputSchema,
  leaveTypeInputSchema,
} from "@/services/hr-leave";
import { runLeaveEntitlementProvisioning } from "@/services/hr-leave-entitlements";

function failure(error: unknown, fallback: string): ActionResult {
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

function refreshLeave() {
  revalidatePath("/hr");
  revalidatePath("/hr/leave");
  revalidatePath("/hr/leave/team");
  revalidatePath("/hr/leave/settings");
}

export async function createLeaveRequestAction(
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = leaveRequestInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };
  try {
    await createLeaveRequest(parsed.data, actor);
    refreshLeave();
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error, "Failed to submit leave request.");
  }
}

export async function decideLeaveRequestAction(
  requestId: string,
  decision: "approved" | "rejected",
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  try {
    await decideLeaveRequest(
      requestId,
      decision,
      String(formData.get("note") ?? "").trim() || undefined,
      actor,
    );
    refreshLeave();
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error, "Failed to decide leave request.");
  }
}

export async function cancelLeaveRequestAction(requestId: string): Promise<void> {
  const actor = await requireUser();
  await cancelLeaveRequest(requestId, actor);
  refreshLeave();
}

export async function createLeaveTypeAction(
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = leaveTypeInputSchema.safeParse({
    ...Object.fromEntries(formData),
    isPaid: formData.get("isPaid") === "true",
    allowCarryForward: formData.get("allowCarryForward") === "true",
    maxCarryForwardDays: formData.get("maxCarryForwardDays") || undefined,
  });
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };
  try {
    await createLeaveType(parsed.data, actor);
    refreshLeave();
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error, "Failed to create leave type.");
  }
}

export async function addLeaveAdjustmentAction(
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = leaveAdjustmentInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };
  try {
    await addLeaveAdjustment(parsed.data, actor);
    refreshLeave();
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error, "Failed to adjust leave balance.");
  }
}

export async function createHolidayAction(
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = holidayInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };
  try {
    await createHoliday(parsed.data, actor);
    refreshLeave();
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error, "Failed to add holiday.");
  }
}

export async function createLeavePolicyAction(
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = leavePolicyInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };
  try {
    await createLeavePolicy(parsed.data, actor);
    await runLeaveEntitlementProvisioning(new Date().getFullYear(), actor.id);
    refreshLeave();
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error, "Failed to assign leave policy.");
  }
}

export async function runLeaveProvisioningAction(
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const year = Number(formData.get("year"));
  if (!Number.isInteger(year) || year < 2000 || year > 2200) {
    return { ok: false, error: "Enter a valid provisioning year." };
  }
  try {
    await assertHrCapability(actor, "hr_admin");
    await runLeaveEntitlementProvisioning(year, actor.id);
    refreshLeave();
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error, "Failed to provision leave balances.");
  }
}
