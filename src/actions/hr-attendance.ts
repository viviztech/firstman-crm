"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, firstIssueMessage } from "@/actions/shared";
import { requireUser } from "@/lib/session";
import {
  assignShift,
  attendanceEntryInputSchema,
  createRegularization,
  createShift,
  decideRegularization,
  lockAttendancePeriod,
  periodLockInputSchema,
  regularizationInputSchema,
  saveAttendanceEntry,
  shiftAssignmentInputSchema,
  shiftInputSchema,
} from "@/services/hr-attendance";

function fail(error: unknown, fallback: string): ActionResult {
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

function refreshAttendance() {
  revalidatePath("/hr");
  revalidatePath("/hr/attendance");
  revalidatePath("/hr/attendance/team");
  revalidatePath("/hr/attendance/settings");
}

export async function createShiftAction(
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = shiftInputSchema.safeParse({
    ...Object.fromEntries(formData),
    crossesMidnight: formData.get("crossesMidnight") === "true",
  });
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };
  try {
    await createShift(parsed.data, actor);
    refreshAttendance();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error, "Failed to create shift.");
  }
}

export async function assignShiftAction(
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = shiftAssignmentInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };
  try {
    await assignShift(parsed.data, actor);
    refreshAttendance();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error, "Failed to assign shift.");
  }
}

export async function saveAttendanceEntryAction(
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = attendanceEntryInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };
  try {
    await saveAttendanceEntry(parsed.data, "manual", actor);
    refreshAttendance();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error, "Failed to save attendance.");
  }
}

export async function createRegularizationAction(
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = regularizationInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };
  try {
    await createRegularization(parsed.data, actor);
    refreshAttendance();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error, "Failed to request attendance regularization.");
  }
}

export async function decideRegularizationAction(
  requestId: string,
  decision: "approved" | "rejected",
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  try {
    await decideRegularization(
      requestId,
      decision,
      String(formData.get("note") ?? "").trim() || undefined,
      actor,
    );
    refreshAttendance();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error, "Failed to decide regularization request.");
  }
}

export async function lockAttendancePeriodAction(
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = periodLockInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };
  try {
    await lockAttendancePeriod(parsed.data, actor);
    refreshAttendance();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error, "Failed to lock attendance period.");
  }
}
