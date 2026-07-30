"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, firstIssueMessage, toScope } from "@/actions/shared";
import { enqueueLeadAssignedNotification } from "@/jobs/lead-notifications";
import type { Role } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import {
  addFollowup,
  convertLeadToClient,
  createLead,
  deleteLead,
  leadFollowupInputSchema,
  leadInputSchema,
  leadStatusUpdateSchema,
  updateLead,
  updateLeadStatus,
} from "@/services/leads";

const CAN_ACCESS: Role[] = ["super_admin", "manager", "executive"];
const CAN_DELETE: Role[] = ["super_admin", "manager"];

export async function createLeadAction(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireUser();
  if (!CAN_ACCESS.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to create leads." };
  }

  const parsed = leadInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const created = await createLead(parsed.data, toScope(currentUser));
  if (created.assignedTo) {
    await enqueueLeadAssignedNotification({ leadId: created.id, assignedTo: created.assignedTo });
  }

  revalidatePath("/leads");
  return { ok: true, data: { id: created.id } };
}

export async function updateLeadAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_ACCESS.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to edit leads." };
  }

  const parsed = leadInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const updated = await updateLead(id, parsed.data, toScope(currentUser));
  if (!updated) {
    return { ok: false, error: "Lead not found, or you do not have access to it." };
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return { ok: true, data: undefined };
}

export async function updateLeadStatusAction(
  id: string,
  status: string,
  lostReason?: string,
): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_ACCESS.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to update leads." };
  }

  const parsed = leadStatusUpdateSchema.safeParse({ status, lostReason });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  try {
    const updated = await updateLeadStatus(id, parsed.data, toScope(currentUser));
    if (!updated) {
      return { ok: false, error: "Lead not found, or you do not have access to it." };
    }
  } catch {
    return { ok: false, error: "Use “Convert to client” to mark a lead as won." };
  }

  revalidatePath("/leads");
  revalidatePath("/leads/kanban");
  revalidatePath(`/leads/${id}`);
  return { ok: true, data: undefined };
}

export async function addFollowupAction(
  leadId: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_ACCESS.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to log follow-ups." };
  }

  const parsed = leadFollowupInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const followup = await addFollowup(leadId, parsed.data, toScope(currentUser));
  if (!followup) {
    return { ok: false, error: "Lead not found, or you do not have access to it." };
  }

  revalidatePath(`/leads/${leadId}`);
  return { ok: true, data: undefined };
}

export async function deleteLeadAction(id: string): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_DELETE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to delete leads." };
  }

  const deleted = await deleteLead(id, toScope(currentUser));
  if (!deleted) {
    return { ok: false, error: "Lead not found." };
  }

  revalidatePath("/leads");
  return { ok: true, data: undefined };
}

export async function convertLeadAction(id: string): Promise<ActionResult<{ clientId: string }>> {
  const currentUser = await requireUser();
  if (!CAN_ACCESS.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to convert leads." };
  }

  const result = await convertLeadToClient(id, toScope(currentUser));
  if (!result) {
    return { ok: false, error: "Lead not found, already converted, or already lost." };
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/clients");
  return { ok: true, data: { clientId: result.client.id } };
}
