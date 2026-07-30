"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, firstIssueMessage, toScope } from "@/actions/shared";
import {
  enqueueInvoiceSentNotification,
  enqueuePaymentReceivedNotification,
} from "@/jobs/invoice-notifications";
import type { Role } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import {
  cancelInvoice,
  createInvoice,
  deleteInvoice,
  invoiceEditSchema,
  invoiceInputSchema,
  paymentInputSchema,
  recordPayment,
  sendInvoice,
  updateInvoice,
} from "@/services/invoices";

const CAN_WRITE: Role[] = ["super_admin", "manager", "accountant"];
const CAN_DELETE: Role[] = ["super_admin", "manager", "accountant"];

/** Line items travel as a JSON blob in a hidden field — FormData has no native array encoding. */
function parseLineItems(formData: FormData): unknown[] {
  const raw = formData.get("lineItemsJson");
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function createInvoiceAction(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireUser();
  if (!CAN_WRITE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to create invoices." };
  }

  const parsed = invoiceInputSchema.safeParse({
    clientId: formData.get("clientId"),
    orderId: formData.get("orderId"),
    lineItems: parseLineItems(formData),
    gstRate: formData.get("gstRate"),
    dueDate: formData.get("dueDate"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const created = await createInvoice(parsed.data, toScope(currentUser));
  if (!created) {
    return { ok: false, error: "You do not have permission to create invoices." };
  }

  revalidatePath("/invoices");
  return { ok: true, data: { id: created.id } };
}

export async function updateInvoiceAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_WRITE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to edit invoices." };
  }

  const parsed = invoiceEditSchema.safeParse({
    orderId: formData.get("orderId"),
    lineItems: parseLineItems(formData),
    gstRate: formData.get("gstRate"),
    dueDate: formData.get("dueDate"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const updated = await updateInvoice(id, parsed.data, toScope(currentUser));
  if (!updated) {
    return {
      ok: false,
      error: "Invoice not found, no longer a draft, or you do not have access to it.",
    };
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  return { ok: true, data: undefined };
}

export async function sendInvoiceAction(id: string): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_WRITE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to send invoices." };
  }

  const updated = await sendInvoice(id, toScope(currentUser));
  if (!updated) {
    return {
      ok: false,
      error: "Invoice not found, already sent, or you do not have access to it.",
    };
  }

  await enqueueInvoiceSentNotification({
    invoiceId: updated.id,
    invoiceNo: updated.invoiceNo,
    clientId: updated.clientId,
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  return { ok: true, data: undefined };
}

export async function recordPaymentAction(
  invoiceId: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_WRITE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to record payments." };
  }

  const parsed = paymentInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const result = await recordPayment(invoiceId, parsed.data, toScope(currentUser));
  if (!result) {
    return {
      ok: false,
      error:
        "Invoice not found, not payable in its current status, or you do not have access to it.",
    };
  }

  await enqueuePaymentReceivedNotification({
    invoiceId: result.invoice.id,
    invoiceNo: result.invoice.invoiceNo,
    clientId: result.invoice.clientId,
    amountPaise: result.payment.amountPaise,
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true, data: undefined };
}

export async function cancelInvoiceAction(id: string): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_WRITE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to cancel invoices." };
  }

  try {
    const updated = await cancelInvoice(id, toScope(currentUser));
    if (!updated) {
      return {
        ok: false,
        error: "Invoice not found, already cancelled, or you do not have access to it.",
      };
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to cancel invoice.",
    };
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  return { ok: true, data: undefined };
}

export async function deleteInvoiceAction(id: string): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_DELETE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to delete invoices." };
  }

  const deleted = await deleteInvoice(id, toScope(currentUser));
  if (!deleted) {
    return { ok: false, error: "Only draft invoices can be deleted." };
  }

  revalidatePath("/invoices");
  return { ok: true, data: undefined };
}
