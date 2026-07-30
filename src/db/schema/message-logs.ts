import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export const messageChannelEnum = pgEnum("message_channel", ["whatsapp", "email"]);
export const messageStatusEnum = pgEnum("message_status", ["sent", "failed", "skipped"]);

/**
 * Append-only send log — deliberately omits updatedAt/deletedAt/createdBy/updatedBy
 * from the shared base columns since log rows are never edited (mirrors activity_logs).
 * Written on every notification attempt, including the WhatsApp log-driver path when
 * WHATSAPP_TOKEN is empty (spec 4.8 Phase 7 check: "message_logs rows created with log driver").
 */
export const messageLogs = pgTable("message_logs", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  channel: messageChannelEnum("channel").notNull(),
  to: text("to").notNull(),
  template: text("template"),
  payload: jsonb("payload"),
  status: messageStatusEnum("status").notNull(),
  error: text("error"),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
