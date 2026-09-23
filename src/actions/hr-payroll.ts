"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/shared";
import { requireUser } from "@/lib/session";
import {
  addPayrollAdjustment,
  addSalaryStructureLine,
  approvePayrollPeriod,
  assignSalaryStructure,
  calculatePayrollPeriod,
  createPayrollPeriod,
  createSalaryComponent,
  createSalaryStructure,
  payrollAdjustmentInputSchema,
  payrollOpeningBalanceInputSchema,
  salaryAssignmentInputSchema,
  salaryComponentInputSchema,
  salaryStructureInputSchema,
  salaryStructureLineInputSchema,
  savePayrollOpeningBalance,
} from "@/services/hr-payroll";
import { markPayrollPaid, postPayrollPeriod } from "@/services/hr-payslips";

function fail(error: unknown, fallback: string): ActionResult {
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}
function refresh() {
  revalidatePath("/hr");
  revalidatePath("/hr/payroll");
  revalidatePath("/hr/payroll/settings");
  revalidatePath("/hr/payslips");
}
const paise = (value: FormDataEntryValue | null) => Math.round(Number(value || 0) * 100);
const basisPoints = (value: FormDataEntryValue | null) => Math.round(Number(value || 0) * 100);

export async function createSalaryComponentAction(
  _: ActionResult | undefined,
  data: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = salaryComponentInputSchema.safeParse({
    ...Object.fromEntries(data),
    taxable: data.get("taxable") === "true",
  });
  if (!parsed.success)
    return fail(new Error(parsed.error.issues[0]?.message), "Invalid component.");
  try {
    await createSalaryComponent(parsed.data, actor);
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error, "Failed to create component.");
  }
}
export async function createSalaryStructureAction(
  _: ActionResult | undefined,
  data: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = salaryStructureInputSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success)
    return fail(new Error(parsed.error.issues[0]?.message), "Invalid structure.");
  try {
    await createSalaryStructure(parsed.data, actor);
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error, "Failed to create structure.");
  }
}
export async function addSalaryStructureLineAction(
  _: ActionResult | undefined,
  data: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = salaryStructureLineInputSchema.safeParse({
    ...Object.fromEntries(data),
    amountPaise: data.get("amountRupees") ? paise(data.get("amountRupees")) : undefined,
    rateBasisPoints: data.get("ratePercent") ? basisPoints(data.get("ratePercent")) : undefined,
  });
  if (!parsed.success)
    return fail(new Error(parsed.error.issues[0]?.message), "Invalid salary line.");
  try {
    await addSalaryStructureLine(parsed.data, actor);
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error, "Failed to save salary line.");
  }
}
export async function assignSalaryStructureAction(
  _: ActionResult | undefined,
  data: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = salaryAssignmentInputSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success)
    return fail(new Error(parsed.error.issues[0]?.message), "Invalid assignment.");
  try {
    await assignSalaryStructure(parsed.data, actor);
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error, "Failed to assign structure.");
  }
}
export async function createPayrollPeriodAction(
  _: ActionResult | undefined,
  data: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  try {
    await createPayrollPeriod(String(data.get("month") ?? ""), actor);
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error, "Failed to create payroll period.");
  }
}
export async function addPayrollAdjustmentAction(
  _: ActionResult | undefined,
  data: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = payrollAdjustmentInputSchema.safeParse({
    ...Object.fromEntries(data),
    amountPaise: paise(data.get("amountRupees")),
  });
  if (!parsed.success)
    return fail(new Error(parsed.error.issues[0]?.message), "Invalid adjustment.");
  try {
    await addPayrollAdjustment(parsed.data, actor);
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error, "Failed to add adjustment.");
  }
}
export async function savePayrollOpeningBalanceAction(
  _: ActionResult | undefined,
  data: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = payrollOpeningBalanceInputSchema.safeParse({
    ...Object.fromEntries(data),
    amountPaise: paise(data.get("amountRupees")),
  });
  if (!parsed.success)
    return fail(new Error(parsed.error.issues[0]?.message), "Invalid opening balance.");
  try {
    await savePayrollOpeningBalance(parsed.data, actor);
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error, "Failed to save opening balance.");
  }
}
async function transition(
  id: string,
  operation: (id: string, actor: Awaited<ReturnType<typeof requireUser>>) => Promise<void>,
  fallback: string,
): Promise<ActionResult> {
  const actor = await requireUser();
  try {
    await operation(id, actor);
    refresh();
    revalidatePath(`/hr/payroll/${id}`);
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error, fallback);
  }
}
export async function calculatePayrollAction(
  id: string,
  _: ActionResult | undefined,
): Promise<ActionResult> {
  return transition(id, calculatePayrollPeriod, "Failed to calculate payroll.");
}
export async function approvePayrollAction(
  id: string,
  _: ActionResult | undefined,
): Promise<ActionResult> {
  return transition(id, approvePayrollPeriod, "Failed to approve payroll.");
}
export async function postPayrollAction(
  id: string,
  _: ActionResult | undefined,
): Promise<ActionResult> {
  return transition(id, postPayrollPeriod, "Failed to post payroll.");
}
export async function markPayrollPaidAction(
  id: string,
  _: ActionResult | undefined,
): Promise<ActionResult> {
  return transition(id, markPayrollPaid, "Failed to mark payroll paid.");
}
