import { and, eq, isNull } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { z } from "zod";
import { db } from "@/db";
import { clients } from "@/db/schema/clients";
import { documentKindEnum, documents } from "@/db/schema/documents";
import { orders } from "@/db/schema/orders";
import { type DetectedFileKind, extensionForKind, mimeTypeForKind } from "@/lib/file-validation";
import { type ActorScope, isPincodeInFranchiseTerritory } from "@/lib/scope";
import { getStorageDriver } from "@/lib/storage";
import { recordActivity } from "@/services/activity-log";

export const documentOwnerTypeSchema = z.enum(["client", "order"]);
export const documentKindSchema = z.enum(documentKindEnum.enumValues);

export const createDocumentInputSchema = z.object({
  ownerType: documentOwnerTypeSchema,
  ownerId: z.string().uuid(),
  kind: documentKindSchema,
  label: z.string().trim().min(2, "Label is required").max(200),
});

export type CreateDocumentInput = z.infer<typeof createDocumentInputSchema>;

export const rejectDocumentInputSchema = z.object({
  reason: z.string().trim().min(2, "A reason is required").max(500),
});

type OwnerType = "client" | "order";

type UploadedFile = { buffer: Buffer; detectedKind: DetectedFileKind };

/**
 * Executives may only touch documents belonging to a client/order in scope — internal-type by
 * assignedTo, franchise-type by pincode territory (spec 3, ADR 0001).
 */
async function isOwnerInTerritory(
  owner: { assignedTo: string | null; pincode: string | null } | undefined,
  scope: ActorScope,
): Promise<boolean> {
  if (!owner) return false;
  if (scope.employeeType === "franchise") {
    return isPincodeInFranchiseTerritory(owner.pincode, scope);
  }
  return owner.assignedTo === scope.userId;
}

async function canAccessOwner(
  ownerType: OwnerType,
  ownerId: string,
  scope: ActorScope,
): Promise<boolean> {
  if (scope.role !== "executive") return true;

  if (ownerType === "client") {
    const client = await db.query.clients.findFirst({
      where: and(eq(clients.id, ownerId), isNull(clients.deletedAt)),
      columns: { assignedTo: true, pincode: true },
    });
    return isOwnerInTerritory(client, scope);
  }

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, ownerId), isNull(orders.deletedAt)),
    columns: { assignedTo: true },
    with: { client: { columns: { pincode: true } } },
  });
  if (!order) return false;
  return await isOwnerInTerritory(
    { assignedTo: order.assignedTo, pincode: order.client.pincode },
    scope,
  );
}

function storageKeyFor(ownerType: OwnerType, ownerId: string, kind: DetectedFileKind): string {
  return `documents/${ownerType}/${ownerId}/${uuidv7()}.${extensionForKind(kind)}`;
}

/** Documents for a single owner — callers (client/order detail pages) already resource-scoped. */
export async function listDocumentsForOwner(ownerType: OwnerType, ownerId: string) {
  return db.query.documents.findMany({
    where: and(
      eq(documents.ownerType, ownerType),
      eq(documents.ownerId, ownerId),
      isNull(documents.deletedAt),
    ),
    // id (uuidv7) is time-ordered too, but as a real tiebreaker it keeps ordering stable
    // when several documents share the same createdAt (bulk-inserted in one transaction).
    orderBy: (document, { asc }) => [asc(document.createdAt), asc(document.id)],
  });
}

export async function getDocument(id: string) {
  return db.query.documents.findFirst({
    where: and(eq(documents.id, id), isNull(documents.deletedAt)),
  });
}

/** Ad-hoc client upload (e.g. general KYC) — order checklist items are pre-created by createOrder instead. */
export async function createClientDocument(
  input: CreateDocumentInput,
  file: UploadedFile,
  actor: ActorScope,
) {
  const allowed = await canAccessOwner(input.ownerType, input.ownerId, actor);
  if (!allowed) return null;

  const key = storageKeyFor(input.ownerType, input.ownerId, file.detectedKind);
  await getStorageDriver().save(key, file.buffer);

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(documents)
      .values({
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        kind: input.kind,
        label: input.label,
        fileName: `${input.label}.${extensionForKind(file.detectedKind)}`,
        path: key,
        mimeType: mimeTypeForKind(file.detectedKind),
        sizeBytes: file.buffer.byteLength,
        status: "received",
        uploadedBy: actor.userId,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .returning();
    if (!created) throw new Error("Failed to create document");

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "document",
        entityId: created.id,
        action: "uploaded",
        diff: { ownerType: input.ownerType, ownerId: input.ownerId, kind: input.kind },
      },
      tx,
    );

    return created;
  });
}

/** Attaches (or replaces) the file on an existing document row — the common order-checklist flow. */
export async function attachDocumentFile(
  documentId: string,
  file: UploadedFile,
  actor: ActorScope,
) {
  const existing = await getDocument(documentId);
  if (!existing) return null;

  const allowed = await canAccessOwner(existing.ownerType, existing.ownerId, actor);
  if (!allowed) return null;

  const key = storageKeyFor(existing.ownerType, existing.ownerId, file.detectedKind);
  await getStorageDriver().save(key, file.buffer);
  if (existing.path) {
    await getStorageDriver()
      .delete(existing.path)
      .catch(() => undefined);
  }

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(documents)
      .set({
        fileName: `${existing.label}.${extensionForKind(file.detectedKind)}`,
        path: key,
        mimeType: mimeTypeForKind(file.detectedKind),
        sizeBytes: file.buffer.byteLength,
        status: "received",
        rejectReason: null,
        uploadedBy: actor.userId,
        updatedBy: actor.userId,
      })
      .where(eq(documents.id, documentId))
      .returning();
    if (!updated) throw new Error("Failed to attach file");

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "document",
        entityId: updated.id,
        action: "file_attached",
      },
      tx,
    );

    return updated;
  });
}

export async function verifyDocument(documentId: string, actor: ActorScope) {
  const existing = await getDocument(documentId);
  if (!existing?.path) return null;

  const allowed = await canAccessOwner(existing.ownerType, existing.ownerId, actor);
  if (!allowed) return null;

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(documents)
      .set({ status: "verified", rejectReason: null, updatedBy: actor.userId })
      .where(eq(documents.id, documentId))
      .returning();
    if (!updated) return null;

    await recordActivity(
      { actorId: actor.userId, entityType: "document", entityId: updated.id, action: "verified" },
      tx,
    );

    return updated;
  });
}

export async function rejectDocument(documentId: string, reason: string, actor: ActorScope) {
  const existing = await getDocument(documentId);
  if (!existing) return null;

  const allowed = await canAccessOwner(existing.ownerType, existing.ownerId, actor);
  if (!allowed) return null;

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(documents)
      .set({ status: "rejected", rejectReason: reason, updatedBy: actor.userId })
      .where(eq(documents.id, documentId))
      .returning();
    if (!updated) return null;

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "document",
        entityId: updated.id,
        action: "rejected",
        diff: { reason },
      },
      tx,
    );

    return updated;
  });
}

/** Scoped fetch for the download route — returns null if the actor can't access this document's owner. */
export async function getDocumentForDownload(documentId: string, actor: ActorScope) {
  const existing = await getDocument(documentId);
  if (!existing?.path) return null;

  const allowed = await canAccessOwner(existing.ownerType, existing.ownerId, actor);
  if (!allowed) return null;

  return existing;
}
