import { index, integer, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { actorColumns, baseColumns } from "@/db/schema/_shared";
import { user } from "@/db/schema/auth-schema";

export const documentOwnerTypeEnum = pgEnum("document_owner_type", ["client", "order"]);

export const documentKindEnum = pgEnum("document_kind", [
  "pan_card",
  "aadhaar",
  "photo",
  "address_proof",
  "moa_aoa",
  "certificate",
  "other",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "pending",
  "received",
  "verified",
  "rejected",
]);

/**
 * Polymorphic owner (client|order) — no FK on ownerId since it targets different tables,
 * matching spec 4.5. Phase 3 only inserts checklist placeholders (no file yet); Phase 4 adds
 * the upload route handler that fills fileName/path/mimeType/sizeBytes and flips status.
 */
export const documents = pgTable(
  "documents",
  {
    ...baseColumns(),
    ...actorColumns(),
    ownerType: documentOwnerTypeEnum("owner_type").notNull(),
    ownerId: uuid("owner_id").notNull(),
    kind: documentKindEnum("kind").notNull(),
    // The catalog's requiredDocuments are free-text ("NOC from property owner"), richer than
    // the fixed `kind` enum — label carries that original text for checklist display.
    label: text("label").notNull(),
    fileName: text("file_name"),
    path: text("path"),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    status: documentStatusEnum("status").notNull().default("pending"),
    rejectReason: text("reject_reason"),
    uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
  },
  (table) => [
    index("documents_owner_idx").on(table.ownerType, table.ownerId),
    index("documents_status_idx").on(table.status),
  ],
);
