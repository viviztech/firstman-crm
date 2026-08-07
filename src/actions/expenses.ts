"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, firstIssueMessage, toScope } from "@/actions/shared";
import type { Role } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import {
  createExpense,
  deleteExpense,
  expenseInputSchema,
  updateExpense,
} from "@/services/expenses";

const CAN_WRITE: Role[] = ["super_admin", "manager", "accountant"];
const CAN_DELETE: Role[] = ["super_admin", "manager", "accountant"];

export async function createExpenseAction(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireUser();
  if (!CAN_WRITE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to create expenses." };
  }

  const parsed = expenseInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const created = await createExpense(parsed.data, await toScope(currentUser));
  if (!created) {
    return { ok: false, error: "You do not have permission to create expenses." };
  }

  revalidatePath("/expenses");
  return { ok: true, data: { id: created.id } };
}

export async function updateExpenseAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_WRITE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to edit expenses." };
  }

  const parsed = expenseInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const updated = await updateExpense(id, parsed.data, await toScope(currentUser));
  if (!updated) {
    return { ok: false, error: "Expense not found, or you do not have access to it." };
  }

  revalidatePath("/expenses");
  return { ok: true, data: undefined };
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_DELETE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to delete expenses." };
  }

  const deleted = await deleteExpense(id, await toScope(currentUser));
  if (!deleted) {
    return { ok: false, error: "Expense not found." };
  }

  revalidatePath("/expenses");
  return { ok: true, data: undefined };
}
