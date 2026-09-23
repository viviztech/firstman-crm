import { createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { z } from "zod";
import { db } from "@/db";
import { employeeDocuments, employeeDocumentTypeEnum } from "@/db/schema/hr-documents";
import { staffProfiles } from "@/db/schema/staff";
import {
  detectFileKind,
  extensionForKind,
  MAX_UPLOAD_BYTES,
  mimeTypeForKind,
} from "@/lib/file-validation";
import { getStorageDriver } from "@/lib/storage";
import { recordActivity } from "@/services/activity-log";
import { assertHrCapability, type HrActor, hasHrCapability } from "@/services/hr";

export const employeeDocumentInputSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(employeeDocumentTypeEnum.enumValues),
  label: z.string().trim().min(2).max(200),
  expiryDate: z.preprocess((value) => (value === "" ? undefined : value), z.iso.date().optional()),
});

export type EmployeeDocumentInput = z.infer<typeof employeeDocumentInputSchema>;

async function findProfile(userId: string) {
  return db.query.staffProfiles.findFirst({
    where: and(eq(staffProfiles.userId, userId), isNull(staffProfiles.deletedAt)),
    columns: { id: true },
  });
}

function canView(userId: string, actor: HrActor) {
  return actor.id === userId ? Promise.resolve(true) : hasHrCapability(actor, "hr_admin");
}

/** Metadata only; never exposes the storage key. */
export async function listEmployeeDocuments(userId: string, actor: HrActor) {
  if (!(await canView(userId, actor)))
    throw new Error("You do not have permission to view employee documents.");
  const profile = await findProfile(userId);
  if (!profile) return [];
  const rows = await db.query.employeeDocuments.findMany({
    where: and(
      eq(employeeDocuments.staffProfileId, profile.id),
      isNull(employeeDocuments.deletedAt),
    ),
    columns: {
      id: true,
      type: true,
      label: true,
      mimeType: true,
      sizeBytes: true,
      expiryDate: true,
      createdAt: true,
    },
    orderBy: (table, { desc }) => [desc(table.createdAt), desc(table.id)],
  });
  if (rows.length) {
    await recordActivity({
      actorId: actor.id,
      entityType: "staff_profile",
      entityId: profile.id,
      action: "employee_documents_viewed",
    });
  }
  return rows;
}

/** HR-only upload, validated by actual file signature, never by supplied name or MIME. */
export async function uploadEmployeeDocument(
  input: EmployeeDocumentInput,
  buffer: Buffer,
  actor: HrActor,
) {
  await assertHrCapability(actor, "hr_admin");
  const parsed = employeeDocumentInputSchema.parse(input);
  if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES)
    throw new Error("File must be 1 byte to 10 MB.");
  const kind = detectFileKind(buffer);
  if (!kind) throw new Error("Only PDF, JPG, PNG, or DOCX files are allowed.");
  const profile = await findProfile(parsed.userId);
  if (!profile) throw new Error("Complete the employee profile first.");

  const id = uuidv7();
  const storageKey = `hr/employees/${profile.id}/${id}.${extensionForKind(kind)}`;
  const storage = getStorageDriver();
  await storage.save(storageKey, buffer);
  try {
    await db.transaction(async (tx) => {
      await tx.insert(employeeDocuments).values({
        id,
        staffProfileId: profile.id,
        type: parsed.type,
        label: parsed.label,
        storageKey,
        mimeType: mimeTypeForKind(kind),
        sizeBytes: buffer.length,
        sha256: createHash("sha256").update(buffer).digest("hex"),
        expiryDate: parsed.expiryDate ?? null,
        createdBy: actor.id,
        updatedBy: actor.id,
      });
      await recordActivity(
        {
          actorId: actor.id,
          entityType: "employee_document",
          entityId: id,
          action: "uploaded",
          diff: { staffProfileId: profile.id, type: parsed.type },
        },
        tx,
      );
    });
  } catch (error) {
    await storage.delete(storageKey).catch(() => undefined);
    throw error;
  }
  return { id };
}

/** Internal download projection; route must read the file and audit a successful delivery. */
export async function getEmployeeDocumentForDownload(id: string, actor: HrActor) {
  const row = await db.query.employeeDocuments.findFirst({
    where: and(eq(employeeDocuments.id, id), isNull(employeeDocuments.deletedAt)),
    columns: { id: true, staffProfileId: true, storageKey: true, mimeType: true, sha256: true },
  });
  if (!row) return null;
  const profile = await db.query.staffProfiles.findFirst({
    where: and(eq(staffProfiles.id, row.staffProfileId), isNull(staffProfiles.deletedAt)),
    columns: { userId: true },
  });
  if (!profile || !(await canView(profile.userId, actor))) return null;
  return row;
}

export async function auditEmployeeDocumentDownload(id: string, actor: HrActor) {
  await recordActivity({
    actorId: actor.id,
    entityType: "employee_document",
    entityId: id,
    action: "downloaded",
  });
}
