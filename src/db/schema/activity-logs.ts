import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { user } from "@/db/schema/auth-schema";

/**
 * Append-only audit trail — deliberately omits updatedAt/deletedAt/createdBy
 * from the shared base columns since log rows are never edited or soft-deleted.
 */
export const activityLogs = pgTable("activity_logs", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(),
  diff: jsonb("diff"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
