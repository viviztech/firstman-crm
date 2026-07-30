"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, firstIssueMessage, toScope } from "@/actions/shared";
import type { Role } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import {
  clientInputSchema,
  createClient,
  deleteClient,
  setWhatsAppOptOut,
  updateClient,
} from "@/services/clients";

const CAN_WRITE: Role[] = ["super_admin", "manager", "executive"];
const CAN_DELETE: Role[] = ["super_admin", "manager"];

export async function createClientAction(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireUser();
  if (!CAN_WRITE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to create clients." };
  }

  const parsed = clientInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const created = await createClient(parsed.data, toScope(currentUser));
  revalidatePath("/clients");
  return { ok: true, data: { id: created.id } };
}

export async function updateClientAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_WRITE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to edit clients." };
  }

  const parsed = clientInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const updated = await updateClient(id, parsed.data, toScope(currentUser));
  if (!updated) {
    return { ok: false, error: "Client not found, or you do not have access to it." };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return { ok: true, data: undefined };
}

export async function setWhatsAppOptOutAction(
  id: string,
  optedOut: boolean,
): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_WRITE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to edit clients." };
  }

  const updated = await setWhatsAppOptOut(id, optedOut, toScope(currentUser));
  if (!updated) {
    return { ok: false, error: "Client not found, or you do not have access to it." };
  }

  revalidatePath(`/clients/${id}`);
  return { ok: true, data: undefined };
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_DELETE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to delete clients." };
  }

  const deleted = await deleteClient(id, toScope(currentUser));
  if (!deleted) {
    return { ok: false, error: "Client not found." };
  }

  revalidatePath("/clients");
  return { ok: true, data: undefined };
}
