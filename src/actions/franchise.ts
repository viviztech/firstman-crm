"use server";

import { revalidatePath } from "next/cache";
import { toScope } from "@/actions/shared";
import { requireRole } from "@/lib/session";
import {
  createConstituency,
  mapPincodeToAssembly,
  removeFranchiseTerritory,
  setFranchiseTerritory,
} from "@/services/franchise-territories";

function nullable(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

export async function saveFranchiseTerritoryAction(formData: FormData) {
  const user = await requireRole("super_admin", "manager");
  const basicRate = nullable(formData.get("basicRateBps"));
  await setFranchiseTerritory(
    {
      userId: String(formData.get("userId") ?? ""),
      level: String(formData.get("level") ?? "") as "state",
      stateId: String(formData.get("stateId") ?? ""),
      parliamentaryConstituencyId: nullable(formData.get("parliamentaryConstituencyId")),
      assemblyConstituencyId: nullable(formData.get("assemblyConstituencyId")),
      pincode: nullable(formData.get("pincode")),
      basicRateBps: basicRate === null ? undefined : Number(basicRate),
      additionalRateBps: Number(formData.get("additionalRateBps")),
    },
    await toScope(user),
  );
  revalidatePath("/settings/franchises");
  revalidatePath("/dashboard");
}

export async function removeFranchiseTerritoryAction(formData: FormData) {
  const user = await requireRole("super_admin", "manager");
  await removeFranchiseTerritory(String(formData.get("id") ?? ""), await toScope(user));
  revalidatePath("/settings/franchises");
}

export async function createConstituencyAction(formData: FormData) {
  const user = await requireRole("super_admin", "manager");
  await createConstituency(
    {
      kind: String(formData.get("kind")) as "parliamentary" | "assembly",
      stateId: String(formData.get("stateId") ?? ""),
      parliamentaryConstituencyId:
        nullable(formData.get("parliamentaryConstituencyId")) ?? undefined,
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      sourceUrl: String(formData.get("sourceUrl") ?? ""),
      sourceVersion: String(formData.get("sourceVersion") ?? ""),
    },
    await toScope(user),
  );
  revalidatePath("/settings/franchises");
}

export async function mapPincodeAction(formData: FormData) {
  const user = await requireRole("super_admin", "manager");
  await mapPincodeToAssembly(
    String(formData.get("pincode") ?? ""),
    String(formData.get("assemblyConstituencyId") ?? ""),
    await toScope(user),
  );
  revalidatePath("/settings/franchises");
}
