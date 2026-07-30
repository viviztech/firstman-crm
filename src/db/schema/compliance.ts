import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { actorColumns, baseColumns } from "@/db/schema/_shared";
import { services } from "@/db/schema/catalog";
import { clients } from "@/db/schema/clients";
import { orders } from "@/db/schema/orders";

export const complianceRecurrenceEnum = pgEnum("compliance_recurrence", [
  "none",
  "monthly",
  "quarterly",
  "yearly",
]);

export const complianceStatusEnum = pgEnum("compliance_status", [
  "upcoming",
  "due_soon",
  "filed",
  "overdue",
  "na",
]);

export const complianceItems = pgTable(
  "compliance_items",
  {
    ...baseColumns(),
    ...actorColumns(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    recurrence: complianceRecurrenceEnum("recurrence").notNull().default("none"),
    status: complianceStatusEnum("status").notNull().default("upcoming"),
    filedAt: timestamp("filed_at", { withTimezone: true }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  },
  (table) => [
    index("compliance_items_client_id_idx").on(table.clientId),
    index("compliance_items_due_date_idx").on(table.dueDate),
    index("compliance_items_status_idx").on(table.status),
  ],
);

export const complianceItemsRelations = relations(complianceItems, ({ one }) => ({
  client: one(clients, { fields: [complianceItems.clientId], references: [clients.id] }),
  service: one(services, { fields: [complianceItems.serviceId], references: [services.id] }),
  order: one(orders, { fields: [complianceItems.orderId], references: [orders.id] }),
}));
