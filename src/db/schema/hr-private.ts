import { index, integer, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { actorColumns, baseColumns } from "@/db/schema/_shared";
import { staffProfiles } from "@/db/schema/staff";

/** Encrypted, HR-only demographic/address record. Never join into directory projections. */
export const employeePrivateDetails = pgTable(
  "employee_private_details",
  {
    ...baseColumns(),
    ...actorColumns(),
    staffProfileId: uuid("staff_profile_id")
      .notNull()
      .references(() => staffProfiles.id, { onDelete: "restrict" }),
    ciphertext: text("ciphertext").notNull(),
    keyVersion: integer("key_version").notNull().default(1),
  },
  (table) => [uniqueIndex("employee_private_details_profile_idx").on(table.staffProfileId)],
);

/** Each emergency contact is encrypted independently for access and future key rotation. */
export const employeeEmergencyContacts = pgTable(
  "employee_emergency_contacts",
  {
    ...baseColumns(),
    ...actorColumns(),
    staffProfileId: uuid("staff_profile_id")
      .notNull()
      .references(() => staffProfiles.id, { onDelete: "restrict" }),
    ciphertext: text("ciphertext").notNull(),
    keyVersion: integer("key_version").notNull().default(1),
    sort: integer("sort").notNull().default(0),
  },
  (table) => [index("employee_emergency_contacts_profile_idx").on(table.staffProfileId)],
);

/** Payroll-only bank instructions; the whole payload is encrypted, not just the account number. */
export const employeeBankAccounts = pgTable(
  "employee_bank_accounts",
  {
    ...baseColumns(),
    ...actorColumns(),
    staffProfileId: uuid("staff_profile_id")
      .notNull()
      .references(() => staffProfiles.id, { onDelete: "restrict" }),
    ciphertext: text("ciphertext").notNull(),
    keyVersion: integer("key_version").notNull().default(1),
  },
  (table) => [uniqueIndex("employee_bank_accounts_profile_idx").on(table.staffProfileId)],
);

/** Payroll-only statutory identifiers and eligibility settings, encrypted as one record. */
export const employeeStatutoryDetails = pgTable(
  "employee_statutory_details",
  {
    ...baseColumns(),
    ...actorColumns(),
    staffProfileId: uuid("staff_profile_id")
      .notNull()
      .references(() => staffProfiles.id, { onDelete: "restrict" }),
    ciphertext: text("ciphertext").notNull(),
    keyVersion: integer("key_version").notNull().default(2),
  },
  (table) => [uniqueIndex("employee_statutory_details_profile_idx").on(table.staffProfileId)],
);
