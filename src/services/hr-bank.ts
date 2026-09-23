import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { employeeBankAccounts } from "@/db/schema/hr-private";
import { staffProfiles } from "@/db/schema/staff";
import { decryptHrJson, encryptHrJson, hrCiphertextVersion } from "@/lib/hr-crypto";
import { recordActivity } from "@/services/activity-log";
import { assertHrCapability, type HrActor, hasHrCapability } from "@/services/hr";

export const bankAccountInputSchema = z.object({
  accountHolderName: z.string().trim().min(2).max(200),
  accountNumber: z.union([
    z.literal(""),
    z
      .string()
      .trim()
      .regex(/^\d{9,18}$/, "Enter a 9–18 digit account number"),
  ]),
  ifsc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC"),
});

export type BankAccountInput = z.infer<typeof bankAccountInputSchema>;
type BankPayload = Omit<BankAccountInput, "accountNumber"> & { accountNumber: string };

async function findProfile(userId: string) {
  return db.query.staffProfiles.findFirst({
    where: and(eq(staffProfiles.userId, userId), isNull(staffProfiles.deletedAt)),
    columns: { id: true },
  });
}

/** Returns only a masked account number, even to payroll administrators. */
export async function getEmployeeBankAccount(userId: string, actor: HrActor) {
  if (actor.id !== userId && !(await hasHrCapability(actor, "payroll_admin"))) {
    throw new Error("You do not have permission to view employee bank details.");
  }
  const profile = await findProfile(userId);
  if (!profile) return null;
  const row = await db.query.employeeBankAccounts.findFirst({
    where: and(
      eq(employeeBankAccounts.staffProfileId, profile.id),
      isNull(employeeBankAccounts.deletedAt),
    ),
  });
  if (!row) return null;
  const payload = decryptHrJson<BankPayload>(row.ciphertext, `employee:${profile.id}:bank`);
  await recordActivity({
    actorId: actor.id,
    entityType: "staff_profile",
    entityId: profile.id,
    action: "bank_details_viewed",
  });
  return {
    accountHolderName: payload.accountHolderName,
    ifsc: payload.ifsc,
    maskedAccountNumber: `••••${payload.accountNumber.slice(-4)}`,
  };
}

/** Full account number is available only to the signed-in employee, never payroll staff. */
export async function getOwnEmployeeBankAccount(actor: HrActor) {
  const profile = await findProfile(actor.id);
  if (!profile) return null;
  const row = await db.query.employeeBankAccounts.findFirst({
    where: and(
      eq(employeeBankAccounts.staffProfileId, profile.id),
      isNull(employeeBankAccounts.deletedAt),
    ),
  });
  if (!row) return null;
  const payload = decryptHrJson<BankPayload>(row.ciphertext, `employee:${profile.id}:bank`);
  await recordActivity({
    actorId: actor.id,
    entityType: "staff_profile",
    entityId: profile.id,
    action: "own_bank_details_viewed",
  });
  return {
    accountHolderName: payload.accountHolderName,
    accountNumber: payload.accountNumber,
    ifsc: payload.ifsc,
  };
}

/** Blank account number retains the existing number; it never clears or reveals it. */
export async function saveEmployeeBankAccount(
  userId: string,
  input: BankAccountInput,
  actor: HrActor,
) {
  await assertHrCapability(actor, "payroll_admin");
  const parsed = bankAccountInputSchema.parse(input);
  const profile = await findProfile(userId);
  if (!profile) throw new Error("Complete the employee profile first.");

  await db.transaction(async (tx) => {
    // Lock the profile so concurrent edits cannot overwrite a newly-created account.
    await tx
      .select({ id: staffProfiles.id })
      .from(staffProfiles)
      .where(eq(staffProfiles.id, profile.id))
      .for("update");
    const existing = await tx.query.employeeBankAccounts.findFirst({
      where: eq(employeeBankAccounts.staffProfileId, profile.id),
    });
    if (!existing && !parsed.accountNumber) throw new Error("Account number is required.");
    const oldNumber = existing
      ? decryptHrJson<BankPayload>(existing.ciphertext, `employee:${profile.id}:bank`).accountNumber
      : "";
    const payload: BankPayload = {
      accountHolderName: parsed.accountHolderName,
      accountNumber: parsed.accountNumber || oldNumber,
      ifsc: parsed.ifsc,
    };
    const ciphertext = encryptHrJson(payload, `employee:${profile.id}:bank`);
    if (existing) {
      await tx
        .update(employeeBankAccounts)
        .set({
          ciphertext,
          keyVersion: hrCiphertextVersion(ciphertext),
          deletedAt: null,
          updatedBy: actor.id,
        })
        .where(eq(employeeBankAccounts.id, existing.id));
    } else {
      await tx.insert(employeeBankAccounts).values({
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
        action: "bank_details_updated",
        // Never include account, IFSC, or holder data in the audit log.
        diff: { userId },
      },
      tx,
    );
  });
}
