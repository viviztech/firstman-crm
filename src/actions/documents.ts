"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, firstIssueMessage, toScope } from "@/actions/shared";
import type { Role } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { rejectDocument, rejectDocumentInputSchema, verifyDocument } from "@/services/documents";

const CAN_MANAGE: Role[] = ["super_admin", "manager", "executive"];

export async function verifyDocumentAction(id: string): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_MANAGE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to verify documents." };
  }

  const updated = await verifyDocument(id, toScope(currentUser));
  if (!updated) {
    return { ok: false, error: "Document not found, has no file yet, or you lack access to it." };
  }

  revalidatePath("/clients");
  revalidatePath("/orders");
  return { ok: true, data: undefined };
}

export async function rejectDocumentAction(id: string, reason: string): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_MANAGE.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to reject documents." };
  }

  const parsed = rejectDocumentInputSchema.safeParse({ reason });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const updated = await rejectDocument(id, parsed.data.reason, toScope(currentUser));
  if (!updated) {
    return { ok: false, error: "Document not found, or you do not have access to it." };
  }

  revalidatePath("/clients");
  revalidatePath("/orders");
  return { ok: true, data: undefined };
}
