import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  employeeBankAccounts,
  employeeEmergencyContacts,
  employeePrivateDetails,
  employeeStatutoryDetails,
} from "@/db/schema/hr-private";
import { decryptHrJson, encryptHrJson, hrCiphertextVersion } from "@/lib/hr-crypto";
import { recordActivity } from "@/services/activity-log";
import type { HrActor } from "@/services/hr";

export type HrKeyRotationResult = {
  privateDetails: number;
  emergencyContacts: number;
  bankAccounts: number;
  statutoryDetails: number;
  total: number;
};

/** Re-encrypts every HR ciphertext with the current BETTER_AUTH_SECRET, atomically. */
export async function rotateHrEncryption(actor: HrActor): Promise<HrKeyRotationResult> {
  if (actor.role !== "super_admin") {
    throw new Error("Only a super administrator can rotate HR encryption.");
  }
  return db.transaction(async (tx) => {
    const [details, contacts, banks, statutory] = await Promise.all([
      tx.select().from(employeePrivateDetails).for("update"),
      tx.select().from(employeeEmergencyContacts).for("update"),
      tx.select().from(employeeBankAccounts).for("update"),
      tx.select().from(employeeStatutoryDetails).for("update"),
    ]);

    for (const row of details) {
      const context = `employee:${row.staffProfileId}:details`;
      const ciphertext = encryptHrJson(decryptHrJson<unknown>(row.ciphertext, context), context);
      await tx
        .update(employeePrivateDetails)
        .set({ ciphertext, keyVersion: hrCiphertextVersion(ciphertext), updatedBy: actor.id })
        .where(eq(employeePrivateDetails.id, row.id));
    }
    for (const row of contacts) {
      const context = `employee:${row.staffProfileId}:contact:${row.id}`;
      const ciphertext = encryptHrJson(decryptHrJson<unknown>(row.ciphertext, context), context);
      await tx
        .update(employeeEmergencyContacts)
        .set({ ciphertext, keyVersion: hrCiphertextVersion(ciphertext), updatedBy: actor.id })
        .where(eq(employeeEmergencyContacts.id, row.id));
    }
    for (const row of banks) {
      const context = `employee:${row.staffProfileId}:bank`;
      const ciphertext = encryptHrJson(decryptHrJson<unknown>(row.ciphertext, context), context);
      await tx
        .update(employeeBankAccounts)
        .set({ ciphertext, keyVersion: hrCiphertextVersion(ciphertext), updatedBy: actor.id })
        .where(eq(employeeBankAccounts.id, row.id));
    }
    for (const row of statutory) {
      const context = `employee:${row.staffProfileId}:statutory`;
      const ciphertext = encryptHrJson(decryptHrJson<unknown>(row.ciphertext, context), context);
      await tx
        .update(employeeStatutoryDetails)
        .set({ ciphertext, keyVersion: hrCiphertextVersion(ciphertext), updatedBy: actor.id })
        .where(eq(employeeStatutoryDetails.id, row.id));
    }

    const result = {
      privateDetails: details.length,
      emergencyContacts: contacts.length,
      bankAccounts: banks.length,
      statutoryDetails: statutory.length,
      total: details.length + contacts.length + banks.length + statutory.length,
    };
    await recordActivity(
      {
        actorId: actor.id,
        entityType: "hr_encryption",
        entityId: actor.id,
        action: "rotated",
        diff: result,
      },
      tx,
    );
    return result;
  });
}
