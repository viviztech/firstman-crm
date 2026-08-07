"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, firstIssueMessage, toScope } from "@/actions/shared";
import type { Role } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import {
  createService,
  createServiceCategory,
  deleteService,
  deleteServiceCategory,
  serviceCategoryInputSchema,
  serviceInputSchema,
  serviceRelationsInputSchema,
  setServiceRelations,
  updateService,
  updateServiceCategory,
} from "@/services/catalog";

const CAN_MANAGE_CATALOG: Role[] = ["super_admin", "manager"];

export async function createServiceCategoryAction(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireUser();
  if (!CAN_MANAGE_CATALOG.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to manage the catalog." };
  }

  const parsed = serviceCategoryInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const created = await createServiceCategory(parsed.data, await toScope(currentUser));
  revalidatePath("/catalog");
  return { ok: true, data: { id: created.id } };
}

export async function updateServiceCategoryAction(
  id: string,
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireUser();
  if (!CAN_MANAGE_CATALOG.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to manage the catalog." };
  }

  const parsed = serviceCategoryInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const updated = await updateServiceCategory(id, parsed.data, await toScope(currentUser));
  if (!updated) {
    return { ok: false, error: "Category not found." };
  }

  revalidatePath("/catalog");
  return { ok: true, data: { id: updated.id } };
}

export async function deleteServiceCategoryAction(id: string): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_MANAGE_CATALOG.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to manage the catalog." };
  }

  const result = await deleteServiceCategory(id, await toScope(currentUser));
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/catalog");
  return { ok: true, data: undefined };
}

export async function createServiceAction(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireUser();
  if (!CAN_MANAGE_CATALOG.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to manage the catalog." };
  }

  const parsed = serviceInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const created = await createService(parsed.data, await toScope(currentUser));

  const relationsRaw = formData.get("serviceRelations");
  const relationsParsed = serviceRelationsInputSchema.safeParse(relationsRaw);
  if (relationsParsed.success && relationsParsed.data.length > 0) {
    await setServiceRelations(created.id, relationsParsed.data, await toScope(currentUser));
  }

  revalidatePath("/catalog");
  return { ok: true, data: { id: created.id } };
}

export async function updateServiceAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_MANAGE_CATALOG.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to manage the catalog." };
  }

  const parsed = serviceInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  const scope = await toScope(currentUser);
  const updated = await updateService(id, parsed.data, scope);
  if (!updated) {
    return { ok: false, error: "Service not found." };
  }

  const relationsParsed = serviceRelationsInputSchema.safeParse(formData.get("serviceRelations"));
  if (relationsParsed.success) {
    const relationsResult = await setServiceRelations(id, relationsParsed.data, scope);
    if (!relationsResult.ok) {
      return { ok: false, error: relationsResult.error };
    }
  }

  revalidatePath("/catalog");
  revalidatePath(`/catalog/services/${id}/edit`);
  return { ok: true, data: undefined };
}

export async function deleteServiceAction(id: string): Promise<ActionResult> {
  const currentUser = await requireUser();
  if (!CAN_MANAGE_CATALOG.includes(currentUser.role)) {
    return { ok: false, error: "You do not have permission to manage the catalog." };
  }

  const deleted = await deleteService(id, await toScope(currentUser));
  if (!deleted) {
    return { ok: false, error: "Service not found." };
  }

  revalidatePath("/catalog");
  return { ok: true, data: undefined };
}
