import { and, eq, isNull } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { z } from "zod";
import { db } from "@/db";
import { employeeEmergencyContacts, employeePrivateDetails } from "@/db/schema/hr-private";
import { staffProfiles } from "@/db/schema/staff";
import { decryptHrJson, encryptHrJson, hrCiphertextVersion } from "@/lib/hr-crypto";
import { optionalTrimmed } from "@/lib/validation/helpers";
import { recordActivity } from "@/services/activity-log";
import { assertHrCapability, type HrActor, hasHrCapability } from "@/services/hr";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(150),
  relationship: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{10,15}$/, "Enter a valid contact phone"),
});

export const privateDetailsInputSchema = z.object({
  dateOfBirth: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date of birth")
      .optional(),
  ),
  gender: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.enum(["female", "male", "non_binary", "prefer_not_to_say"]).optional(),
  ),
  residentialAddress: optionalTrimmed(1000),
  permanentAddress: optionalTrimmed(1000),
  emergencyContacts: z.array(contactSchema).max(3, "Add at most three emergency contacts"),
});

export type PrivateDetailsInput = z.infer<typeof privateDetailsInputSchema>;

type PrivatePayload = Omit<PrivateDetailsInput, "emergencyContacts">;
type EmergencyContact = z.infer<typeof contactSchema>;

async function findProfile(userId: string) {
  return db.query.staffProfiles.findFirst({
    where: and(eq(staffProfiles.userId, userId), isNull(staffProfiles.deletedAt)),
    columns: { id: true },
  });
}

/** Only the employee or an HR administrator may read this explicit private projection. */
export async function getEmployeePrivateDetails(userId: string, actor: HrActor) {
  if (actor.id !== userId && !(await hasHrCapability(actor, "hr_admin"))) {
    throw new Error("You do not have permission to view private employee details.");
  }
  const profile = await findProfile(userId);
  if (!profile) return null;
  const [detailsRow, contacts] = await Promise.all([
    db.query.employeePrivateDetails.findFirst({
      where: and(
        eq(employeePrivateDetails.staffProfileId, profile.id),
        isNull(employeePrivateDetails.deletedAt),
      ),
    }),
    db.query.employeeEmergencyContacts.findMany({
      where: and(
        eq(employeeEmergencyContacts.staffProfileId, profile.id),
        isNull(employeeEmergencyContacts.deletedAt),
      ),
      orderBy: (table, { asc }) => [asc(table.sort)],
    }),
  ]);
  const details = detailsRow
    ? decryptHrJson<PrivatePayload>(detailsRow.ciphertext, `employee:${profile.id}:details`)
    : null;
  const emergencyContacts = contacts.map((row) => ({
    id: row.id,
    ...decryptHrJson<EmergencyContact>(row.ciphertext, `employee:${profile.id}:contact:${row.id}`),
  }));

  if (detailsRow || contacts.length) {
    await recordActivity({
      actorId: actor.id,
      entityType: "staff_profile",
      entityId: profile.id,
      action: "private_details_viewed",
    });
  }
  return { details, emergencyContacts };
}

/** HR-only replacement; previous encrypted contact rows are soft-deleted for history. */
export async function saveEmployeePrivateDetails(
  userId: string,
  input: PrivateDetailsInput,
  actor: HrActor,
) {
  await assertHrCapability(actor, "hr_admin");
  const parsed = privateDetailsInputSchema.parse(input);
  const profile = await findProfile(userId);
  if (!profile) throw new Error("Complete the employee profile first.");

  const { emergencyContacts, ...details } = parsed;
  const ciphertext = encryptHrJson(details, `employee:${profile.id}:details`);
  const contactRows = emergencyContacts.map((contact, sort) => {
    const id = uuidv7();
    const encryptedContact = encryptHrJson(contact, `employee:${profile.id}:contact:${id}`);
    return {
      id,
      staffProfileId: profile.id,
      ciphertext: encryptedContact,
      keyVersion: hrCiphertextVersion(encryptedContact),
      sort,
      createdBy: actor.id,
      updatedBy: actor.id,
    };
  });

  await db.transaction(async (tx) => {
    const existing = await tx.query.employeePrivateDetails.findFirst({
      where: eq(employeePrivateDetails.staffProfileId, profile.id),
      columns: { id: true },
    });
    if (existing) {
      await tx
        .update(employeePrivateDetails)
        .set({
          ciphertext,
          keyVersion: hrCiphertextVersion(ciphertext),
          deletedAt: null,
          updatedBy: actor.id,
        })
        .where(eq(employeePrivateDetails.id, existing.id));
    } else {
      await tx.insert(employeePrivateDetails).values({
        staffProfileId: profile.id,
        ciphertext,
        keyVersion: hrCiphertextVersion(ciphertext),
        createdBy: actor.id,
        updatedBy: actor.id,
      });
    }

    await tx
      .update(employeeEmergencyContacts)
      .set({ deletedAt: new Date(), updatedBy: actor.id })
      .where(
        and(
          eq(employeeEmergencyContacts.staffProfileId, profile.id),
          isNull(employeeEmergencyContacts.deletedAt),
        ),
      );
    if (contactRows.length) await tx.insert(employeeEmergencyContacts).values(contactRows);

    await recordActivity(
      {
        actorId: actor.id,
        entityType: "staff_profile",
        entityId: profile.id,
        action: "private_details_updated",
        // Never put demographic/address/contact values into the audit log.
        diff: { userId, contactCount: emergencyContacts.length },
      },
      tx,
    );
  });
}
