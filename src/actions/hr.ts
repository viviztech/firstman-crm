"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, firstIssueMessage } from "@/actions/shared";
import { requireUser } from "@/lib/session";
import {
  createDepartment,
  createDesignation,
  createWorkLocation,
  employeeProfileInputSchema,
  type HrCapability,
  organizationUnitInputSchema,
  setHrCapability,
  updateEmployeeProfile,
  workLocationInputSchema,
} from "@/services/hr";
import { bankAccountInputSchema, saveEmployeeBankAccount } from "@/services/hr-bank";
import { type HrKeyRotationResult, rotateHrEncryption } from "@/services/hr-key-rotation";
import {
  employeeTransitionInputSchema,
  rehireEmployee,
  rehireEmployeeInputSchema,
  transitionEmployeeStatus,
} from "@/services/hr-lifecycle";
import { privateDetailsInputSchema, saveEmployeePrivateDetails } from "@/services/hr-private";
import { saveEmployeeStatutoryDetails, statutoryDetailsInputSchema } from "@/services/hr-statutory";

function errorResult(error: unknown, fallback: string): ActionResult {
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

export async function updateEmployeeProfileAction(
  userId: string,
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = employeeProfileInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };

  try {
    await updateEmployeeProfile(userId, parsed.data, actor);
    revalidatePath("/hr");
    revalidatePath("/hr/employees");
    revalidatePath(`/hr/employees/${userId}`);
    revalidatePath("/hr/me");
    return { ok: true, data: undefined };
  } catch (error) {
    return errorResult(error, "Failed to update employee profile.");
  }
}

export async function createDepartmentAction(
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = organizationUnitInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };
  try {
    await createDepartment(parsed.data, actor);
    revalidatePath("/hr/organization");
    return { ok: true, data: undefined };
  } catch (error) {
    return errorResult(error, "Failed to create department.");
  }
}

export async function createDesignationAction(
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = organizationUnitInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };
  try {
    await createDesignation(parsed.data, actor);
    revalidatePath("/hr/organization");
    return { ok: true, data: undefined };
  } catch (error) {
    return errorResult(error, "Failed to create designation.");
  }
}

export async function createWorkLocationAction(
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = workLocationInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };
  try {
    await createWorkLocation(parsed.data, actor);
    revalidatePath("/hr/organization");
    return { ok: true, data: undefined };
  } catch (error) {
    return errorResult(error, "Failed to create work location.");
  }
}

export async function setHrCapabilityAction(
  userId: string,
  capability: HrCapability,
  enabled: boolean,
): Promise<ActionResult> {
  const actor = await requireUser();
  try {
    await setHrCapability(userId, capability, enabled, actor);
    revalidatePath("/hr/employees");
    return { ok: true, data: undefined };
  } catch (error) {
    return errorResult(error, "Failed to update HR capability.");
  }
}

export async function transitionEmployeeStatusAction(
  userId: string,
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = employeeTransitionInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };
  if (parsed.data.toStatus === "exited" && formData.get("confirmExit") !== "yes") {
    return { ok: false, error: "Confirm that access will be revoked immediately." };
  }
  try {
    await transitionEmployeeStatus(userId, parsed.data, actor);
    revalidatePath("/hr");
    revalidatePath("/hr/employees");
    revalidatePath(`/hr/employees/${userId}`);
    revalidatePath("/hr/directory");
    revalidatePath("/settings/users");
    return { ok: true, data: undefined };
  } catch (error) {
    return errorResult(error, "Failed to change employment status.");
  }
}

export async function rehireEmployeeAction(
  userId: string,
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  if (formData.get("confirmRehire") !== "yes") {
    return { ok: false, error: "Confirm that account access will be restored." };
  }
  const payrollChoice = formData.get("payrollEligible");
  if (payrollChoice !== "true" && payrollChoice !== "false") {
    return { ok: false, error: "Choose payroll eligibility." };
  }
  const parsed = rehireEmployeeInputSchema.safeParse({
    ...Object.fromEntries(formData),
    payrollEligible: payrollChoice === "true",
  });
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };
  try {
    await rehireEmployee(userId, parsed.data, actor);
    revalidatePath("/hr");
    revalidatePath("/hr/employees");
    revalidatePath(`/hr/employees/${userId}`);
    revalidatePath("/hr/directory");
    revalidatePath("/settings/users");
    return { ok: true, data: undefined };
  } catch (error) {
    return errorResult(error, "Failed to rehire employee.");
  }
}

export async function saveEmployeePrivateDetailsAction(
  userId: string,
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const emergencyContacts = [0, 1, 2]
    .map((index) => ({
      name: String(formData.get(`contactName${index}`) ?? "").trim(),
      relationship: String(formData.get(`contactRelationship${index}`) ?? "").trim(),
      phone: String(formData.get(`contactPhone${index}`) ?? "").trim(),
    }))
    .filter((contact) => contact.name || contact.relationship || contact.phone);
  const parsed = privateDetailsInputSchema.safeParse({
    ...Object.fromEntries(formData),
    emergencyContacts,
  });
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };
  try {
    await saveEmployeePrivateDetails(userId, parsed.data, actor);
    revalidatePath(`/hr/employees/${userId}`);
    revalidatePath("/hr/me");
    return { ok: true, data: undefined };
  } catch (error) {
    if (error instanceof Error && error.message === "HR encryption key is not configured.") {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "Failed to save private employee details." };
  }
}

export async function saveEmployeeBankAccountAction(
  userId: string,
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = bankAccountInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };
  try {
    await saveEmployeeBankAccount(userId, parsed.data, actor);
    revalidatePath(`/hr/bank/${userId}`);
    revalidatePath("/hr/me");
    return { ok: true, data: undefined };
  } catch (error) {
    if (
      error instanceof Error &&
      ["HR encryption key is not configured.", "Account number is required."].includes(
        error.message,
      )
    ) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "Failed to save employee bank details." };
  }
}

export async function saveEmployeeStatutoryDetailsAction(
  userId: string,
  _previous: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = statutoryDetailsInputSchema.safeParse({
    ...Object.fromEntries(formData),
    pfEligible: formData.get("pfEligible") === "true",
    esiEligible: formData.get("esiEligible") === "true",
    professionalTaxEligible: formData.get("professionalTaxEligible") === "true",
  });
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };
  try {
    await saveEmployeeStatutoryDetails(userId, parsed.data, actor);
    revalidatePath(`/hr/statutory/${userId}`);
    revalidatePath("/hr/me");
    return { ok: true, data: undefined };
  } catch (error) {
    return errorResult(error, "Failed to save employee statutory details.");
  }
}

export async function rotateHrEncryptionAction(
  _previous: ActionResult<HrKeyRotationResult> | undefined,
  formData: FormData,
): Promise<ActionResult<HrKeyRotationResult>> {
  const actor = await requireUser();
  if (formData.get("confirmation") !== "ROTATE HR DATA") {
    return { ok: false, error: "Type ROTATE HR DATA to confirm." };
  }
  try {
    const result = await rotateHrEncryption(actor);
    revalidatePath("/hr/security");
    return { ok: true, data: result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to rotate HR encryption.",
    };
  }
}
