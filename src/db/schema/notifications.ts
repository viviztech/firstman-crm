import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { baseColumns } from "@/db/schema/_shared";
import { user } from "@/db/schema/auth-schema";

export const notificationTypeEnum = pgEnum("notification_type", [
  "enquiry_assigned",
  "order_status_changed",
  "invoice_overdue_digest",
  "task_overdue",
]);

/**
 * Real, event-driven in-app notifications for staff — replaces the old topbar bell, which used
 * to recompute a live "what's overdue right now" query on every request instead of persisting
 * anything (README Assumptions). `readAt` follows the same nullable-timestamp idiom as
 * `deletedAt` elsewhere in the schema, so "unread" is simply `readAt IS NULL`.
 */
export const notifications = pgTable(
  "notifications",
  {
    ...baseColumns(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    href: text("href").notNull(),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (table) => [
    index("notifications_user_unread_idx").on(table.userId, table.readAt, table.createdAt),
    index("notifications_entity_idx").on(table.entityType, table.entityId),
  ],
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(user, { fields: [notifications.userId], references: [user.id] }),
}));
