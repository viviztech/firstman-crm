"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, firstIssueMessage, toScope } from "@/actions/shared";
import { enqueueOrderStatusChangedNotification } from "@/jobs/order-notifications";
import type { Role } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import {
  createOrder,
  deleteOrder,
  orderEditSchema,
  orderInputSchema,
  orderStatusUpdateSchema,
  orderTaskStatusUpdateSchema,
  updateOrder,
  updateOrderStatus,
  updateOrderTaskStatus,
} from "@/services/orders";

const CAN_WRITE: Role[] = ["super_admin", "manager", "executive"];
const CAN_DELETE: Role[] = ["super_admin", "manager"];

export async function createOrderAction(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireUser();
  if (!CAN_WRITE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to create orders." };
  }

  const parsed = orderInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const created = await createOrder(parsed.data, await toScope(currentUser));
  revalidatePath("/orders");
  return { ok: true, data: { id: created.id } };
}

export async function updateOrderAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_WRITE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to edit orders." };
  }

  const parsed = orderEditSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const updated = await updateOrder(id, parsed.data, await toScope(currentUser));
  if (!updated) {
    return { ok: false, error: "Order not found, or you do not have access to it." };
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  return { ok: true, data: undefined };
}

export async function updateOrderStatusAction(id: string, status: string): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_WRITE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to update orders." };
  }

  const parsed = orderStatusUpdateSchema.safeParse({ status });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const updated = await updateOrderStatus(id, parsed.data.status, await toScope(currentUser));
  if (!updated) {
    return { ok: false, error: "Order not found, or you do not have access to it." };
  }

  await enqueueOrderStatusChangedNotification({
    orderId: updated.id,
    orderNo: updated.orderNo,
    status: updated.status,
  });

  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  return { ok: true, data: undefined };
}

export async function updateOrderTaskStatusAction(
  orderId: string,
  taskId: string,
  status: string,
): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_WRITE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to update tasks." };
  }

  const parsed = orderTaskStatusUpdateSchema.safeParse({ status });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const updated = await updateOrderTaskStatus(
    orderId,
    taskId,
    parsed.data.status,
    await toScope(currentUser),
  );
  if (!updated) {
    return { ok: false, error: "Task not found, or you do not have access to it." };
  }

  revalidatePath(`/orders/${orderId}`);
  return { ok: true, data: undefined };
}

export async function deleteOrderAction(id: string): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_DELETE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to delete orders." };
  }

  const deleted = await deleteOrder(id, await toScope(currentUser));
  if (!deleted) {
    return { ok: false, error: "Order not found." };
  }

  revalidatePath("/orders");
  return { ok: true, data: undefined };
}
