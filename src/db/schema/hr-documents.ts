import { date, index, integer, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { actorColumns, baseColumns } from "@/db/schema/_shared";
import { staffProfiles } from "@/db/schema/staff";

export const employeeDocumentTypeEnum = pgEnum("employee_document_type", [
  "offer_letter",
  "appointment_letter",
  "employment_contract",
  "identity_proof",
  "address_proof",
  "certificate",
  "other",
]);

/** Kept separate from CRM client/order documents and never joined into directory rows. */
export const employeeDocuments = pgTable(
  "employee_documents",
  {
    ...baseColumns(),
    ...actorColumns(),
    staffProfileId: uuid("staff_profile_id")
      .notNull()
      .references(() => staffProfiles.id, { onDelete: "restrict" }),
    type: employeeDocumentTypeEnum("type").notNull(),
    label: text("label").notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    expiryDate: date("expiry_date"),
  },
  (table) => [index("employee_documents_profile_idx").on(table.staffProfileId)],
);
