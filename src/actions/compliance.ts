"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, firstIssueMessage, toScope } from "@/actions/shared";
import type { Role } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import {
  complianceItemEditSchema,
  complianceItemInputSchema,
  createComplianceItem,
  createOrderFromComplianceItem,
  deleteComplianceItem,
  markComplianceItemFiled,
  updateComplianceItem,
} from "@/services/compliance";

const CAN_WRITE: Role[] = ["super_admin", "manager", "executive"];
const CAN_DELETE: Role[] = ["super_admin", "manager"];

export async function createComplianceItemAction(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireUser();
  if (!CAN_WRITE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to create compliance items." };
  }

  const parsed = complianceItemInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const created = await createComplianceItem(parsed.data, toScope(currentUser));
  if (!created) {
    return { ok: false, error: "Client not found, or you do not have access to it." };
  }

  revalidatePath("/compliance");
  return { ok: true, data: { id: created.id } };
}

export async function updateComplianceItemAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_WRITE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to edit compliance items." };
  }

  const parsed = complianceItemEditSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const updated = await updateComplianceItem(id, parsed.data, toScope(currentUser));
  if (!updated) {
    return { ok: false, error: "Compliance item not found, or you do not have access to it." };
  }

  revalidatePath("/compliance");
  revalidatePath(`/compliance/${id}`);
  return { ok: true, data: undefined };
}

export async function markComplianceItemFiledAction(id: string): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_WRITE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to update compliance items." };
  }

  const result = await markComplianceItemFiled(id, toScope(currentUser));
  if (!result) {
    return { ok: false, error: "Compliance item not found, already filed, or you lack access." };
  }

  revalidatePath("/compliance");
  revalidatePath(`/compliance/${id}`);
  return { ok: true, data: undefined };
}

export async function createOrderFromComplianceItemAction(
  id: string,
): Promise<ActionResult<{ orderId: string }>> {
  const currentUser = await requireUser();
  if (!CAN_WRITE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to create orders." };
  }

  let order: Awaited<ReturnType<typeof createOrderFromComplianceItem>>;
  try {
    order = await createOrderFromComplianceItem(id, toScope(currentUser));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create order.";
    return { ok: false, error: message };
  }
  if (!order) {
    return { ok: false, error: "Compliance item not found, or you do not have access to it." };
  }

  revalidatePath("/compliance");
  revalidatePath(`/compliance/${id}`);
  revalidatePath("/orders");
  return { ok: true, data: { orderId: order.id } };
}

export async function deleteComplianceItemAction(id: string): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_DELETE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to delete compliance items." };
  }

  const deleted = await deleteComplianceItem(id, toScope(currentUser));
  if (!deleted) {
    return { ok: false, error: "Compliance item not found." };
  }

  revalidatePath("/compliance");
  return { ok: true, data: undefined };
}
