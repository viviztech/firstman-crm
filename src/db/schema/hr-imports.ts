import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { user } from "@/db/schema/auth-schema";

export const employeeImportStatusEnum = pgEnum("employee_import_status", ["prepared", "committed"]);

/** Preview receipt; CSV contents are never persisted. One committed batch cannot be replayed. */
export const employeeImportBatches = pgTable("employee_import_batches", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  actorId: text("actor_id")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  fileSha256: text("file_sha256").notNull(),
  rowCount: integer("row_count").notNull(),
  status: employeeImportStatusEnum("status").notNull().default("prepared"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  committedAt: timestamp("committed_at", { withTimezone: true }),
});
