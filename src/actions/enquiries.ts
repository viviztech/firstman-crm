"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, firstIssueMessage, toScope } from "@/actions/shared";
import { enqueueEnquiryAssignedNotification } from "@/jobs/enquiry-notifications";
import type { Role } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import {
  addFollowup,
  claimEnquiry,
  closeEnquiryAsSale,
  closeEnquiryAsSaleInputSchema,
  createEnquiry,
  deleteEnquiry,
  enquiryFollowupInputSchema,
  enquiryInputSchema,
  enquiryStatusUpdateSchema,
  hardDeleteEnquiry,
  updateEnquiry,
  updateEnquiryStatus,
} from "@/services/enquiries";

const CAN_ACCESS: Role[] = ["super_admin", "manager", "executive"];
const CAN_DELETE: Role[] = ["super_admin", "manager"];

/** Service lines travel as a JSON blob in a hidden field — FormData has no native array encoding
 * (mirrors parseLineItems in actions/invoices.ts). */
function parseServiceLines(formData: FormData): unknown[] {
  const raw = formData.get("servicesJson");
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function createEnquiryAction(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireUser();
  if (!CAN_ACCESS.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to create enquiries." };
  }

  const parsed = enquiryInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const created = await createEnquiry(parsed.data, await toScope(currentUser));
  if (created.assignedTo) {
    await enqueueEnquiryAssignedNotification({
      enquiryId: created.id,
      assignedTo: created.assignedTo,
    });
  }

  revalidatePath("/enquiries");
  return { ok: true, data: { id: created.id } };
}

export async function updateEnquiryAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_ACCESS.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to edit enquiries." };
  }

  const parsed = enquiryInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const updated = await updateEnquiry(id, parsed.data, await toScope(currentUser));
  if (!updated) {
    return { ok: false, error: "Enquiry not found, or you do not have access to it." };
  }

  revalidatePath("/enquiries");
  revalidatePath(`/enquiries/${id}`);
  return { ok: true, data: undefined };
}

export async function updateEnquiryStatusAction(
  id: string,
  status: string,
  lostReason?: string,
): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_ACCESS.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to update enquiries." };
  }

  const parsed = enquiryStatusUpdateSchema.safeParse({ status, lostReason });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  try {
    const updated = await updateEnquiryStatus(id, parsed.data, await toScope(currentUser));
    if (!updated) {
      return { ok: false, error: "Enquiry not found, or you do not have access to it." };
    }
  } catch {
    return { ok: false, error: "Use the Sales action to mark an enquiry as won." };
  }

  revalidatePath("/enquiries");
  revalidatePath("/enquiries/kanban");
  revalidatePath(`/enquiries/${id}`);
  return { ok: true, data: undefined };
}

export async function addFollowupAction(
  enquiryId: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_ACCESS.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to log follow-ups." };
  }

  const parsed = enquiryFollowupInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const followup = await addFollowup(enquiryId, parsed.data, await toScope(currentUser));
  if (!followup) {
    return { ok: false, error: "Enquiry not found, or you do not have access to it." };
  }

  revalidatePath(`/enquiries/${enquiryId}`);
  return { ok: true, data: undefined };
}

export async function deleteEnquiryAction(id: string): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_DELETE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to delete enquiries." };
  }

  const deleted = await deleteEnquiry(id, await toScope(currentUser));
  if (!deleted) {
    return { ok: false, error: "Enquiry not found." };
  }

  revalidatePath("/enquiries");
  return { ok: true, data: undefined };
}

export async function closeEnquiryAsSaleAction(
  id: string,
  _prev:
    | ActionResult<{ clientId: string; orderIds: string[]; proformaInvoiceIds: string[] }>
    | undefined,
  formData: FormData,
): Promise<ActionResult<{ clientId: string; orderIds: string[]; proformaInvoiceIds: string[] }>> {
  const currentUser = await requireUser();
  if (!CAN_ACCESS.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to close a sale on this enquiry." };
  }

  const parsed = closeEnquiryAsSaleInputSchema.safeParse({
    ...Object.fromEntries(formData),
    services: parseServiceLines(formData),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const result = await closeEnquiryAsSale(id, parsed.data, await toScope(currentUser));
  if (!result) {
    return { ok: false, error: "Enquiry not found, already converted, or already lost." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/enquiries");
  revalidatePath(`/enquiries/${id}`);
  revalidatePath("/clients");
  revalidatePath("/orders");
  revalidatePath("/invoices");
  return {
    ok: true,
    data: {
      clientId: result.client.id,
      orderIds: result.orders.map((order) => order.id),
      proformaInvoiceIds: result.proformaInvoices.map((invoice) => invoice.id),
    },
  };
}

export async function claimEnquiryAction(id: string): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_ACCESS.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to pick up enquiries." };
  }

  const claimed = await claimEnquiry(id, await toScope(currentUser));
  if (!claimed) {
    return { ok: false, error: "This enquiry was already picked up by someone else." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/enquiries");
  revalidatePath(`/enquiries/${id}`);
  return { ok: true, data: undefined };
}

export async function hardDeleteEnquiryAction(id: string): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (currentUser.role !== "super_admin") {
    return { ok: false, error: "Only super admins can permanently delete an enquiry." };
  }

  const deleted = await hardDeleteEnquiry(id, await toScope(currentUser));
  if (!deleted) {
    return { ok: false, error: "Enquiry not found." };
  }

  revalidatePath("/settings/lost-enquiries");
  return { ok: true, data: undefined };
}
