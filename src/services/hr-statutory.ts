import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { employeeStatutoryDetails } from "@/db/schema/hr-private";
import { staffProfiles } from "@/db/schema/staff";
import { decryptHrJson, encryptHrJson, hrCiphertextVersion } from "@/lib/hr-crypto";
import { recordActivity } from "@/services/activity-log";
import { assertHrCapability, type HrActor, hasHrCapability } from "@/services/hr";

const optionalIdentifier = (pattern: RegExp, message: string) =>
  z.union([z.literal(""), z.string().trim().toUpperCase().regex(pattern, message)]);

export const statutoryDetailsInputSchema = z.object({
  pan: optionalIdentifier(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid PAN"),
  uan: optionalIdentifier(/^\d{12}$/, "UAN must be 12 digits"),
  esiNumber: optionalIdentifier(/^\d{10,17}$/, "ESI number must be 10–17 digits"),
  aadhaarLastFour: optionalIdentifier(/^\d{4}$/, "Enter only the last four Aadhaar digits"),
  pfEligible: z.boolean(),
  esiEligible: z.boolean(),
  professionalTaxEligible: z.boolean(),
});

export type StatutoryDetailsInput = z.infer<typeof statutoryDetailsInputSchema>;

async function findProfile(userId: string) {
  return db.query.staffProfiles.findFirst({
    where: and(eq(staffProfiles.userId, userId), isNull(staffProfiles.deletedAt)),
    columns: { id: true },
  });
}

function mask(value: string) {
  if (!value) return "Not set";
  return `${"•".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

async function readPayload(userId: string) {
  const profile = await findProfile(userId);
  if (!profile) return null;
  const row = await db.query.employeeStatutoryDetails.findFirst({
    where: and(
      eq(employeeStatutoryDetails.staffProfileId, profile.id),
      isNull(employeeStatutoryDetails.deletedAt),
    ),
  });
  if (!row) return null;
  return {
    profileId: profile.id,
    payload: decryptHrJson<StatutoryDetailsInput>(
      row.ciphertext,
      `employee:${profile.id}:statutory`,
    ),
  };
}

/** Full identifiers are available only to the employee. */
export async function getOwnEmployeeStatutoryDetails(actor: HrActor) {
  const result = await readPayload(actor.id);
  if (!result) return null;
  await recordActivity({
    actorId: actor.id,
    entityType: "staff_profile",
    entityId: result.profileId,
    action: "own_statutory_details_viewed",
  });
  return result.payload;
}

/** Payroll administrators receive only masked identifiers plus eligibility flags. */
export async function getEmployeeStatutoryDetails(userId: string, actor: HrActor) {
  if (!(await hasHrCapability(actor, "payroll_admin"))) {
    throw new Error("You do not have permission to view employee statutory details.");
  }
  const result = await readPayload(userId);
  if (!result) return null;
  await recordActivity({
    actorId: actor.id,
    entityType: "staff_profile",
    entityId: result.profileId,
    action: "statutory_details_viewed",
  });
  return {
    pan: mask(result.payload.pan),
    uan: mask(result.payload.uan),
    esiNumber: mask(result.payload.esiNumber),
    aadhaarLastFour: result.payload.aadhaarLastFour || "Not set",
    pfEligible: result.payload.pfEligible,
    esiEligible: result.payload.esiEligible,
    professionalTaxEligible: result.payload.professionalTaxEligible,
  };
}

/** Blank identifier fields retain existing values; explicit clearing is intentionally disallowed. */
export async function saveEmployeeStatutoryDetails(
  userId: string,
  input: StatutoryDetailsInput,
  actor: HrActor,
) {
  await assertHrCapability(actor, "payroll_admin");
  const parsed = statutoryDetailsInputSchema.parse(input);
  const profile = await findProfile(userId);
  if (!profile) throw new Error("Complete the employee profile first.");
  await db.transaction(async (tx) => {
    await tx
      .select({ id: staffProfiles.id })
      .from(staffProfiles)
      .where(eq(staffProfiles.id, profile.id))
      .for("update");
    const existing = await tx.query.employeeStatutoryDetails.findFirst({
      where: eq(employeeStatutoryDetails.staffProfileId, profile.id),
    });
    const old = existing
      ? decryptHrJson<StatutoryDetailsInput>(
          existing.ciphertext,
          `employee:${profile.id}:statutory`,
        )
      : null;
    const payload: StatutoryDetailsInput = {
      ...parsed,
      pan: parsed.pan || old?.pan || "",
      uan: parsed.uan || old?.uan || "",
      esiNumber: parsed.esiNumber || old?.esiNumber || "",
      aadhaarLastFour: parsed.aadhaarLastFour || old?.aadhaarLastFour || "",
    };
    const ciphertext = encryptHrJson(payload, `employee:${profile.id}:statutory`);
    if (existing) {
      await tx
        .update(employeeStatutoryDetails)
        .set({
          ciphertext,
          keyVersion: hrCiphertextVersion(ciphertext),
          deletedAt: null,
          updatedBy: actor.id,
        })
        .where(eq(employeeStatutoryDetails.id, existing.id));
    } else {
      await tx.insert(employeeStatutoryDetails).values({
        staffProfileId: profile.id,
        ciphertext,
        keyVersion: hrCiphertextVersion(ciphertext),
        createdBy: actor.id,
        updatedBy: actor.id,
      });
    }
    await recordActivity(
      {
        actorId: actor.id,
        entityType: "staff_profile",
        entityId: profile.id,
        action: "statutory_details_updated",
        diff: { userId },
      },
      tx,
    );
  });
}
