import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { actorColumns, baseColumns } from "@/db/schema/_shared";
import { user } from "@/db/schema/auth-schema";
import { services } from "@/db/schema/catalog";
import { clients } from "@/db/schema/clients";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "docs_awaited",
  "in_progress",
  "govt_processing",
  "on_hold",
  "completed",
  "cancelled",
]);

export const orderTaskStatusEnum = pgEnum("order_task_status", [
  "pending",
  "in_progress",
  "done",
  "blocked",
]);

export const orders = pgTable(
  "orders",
  {
    ...baseColumns(),
    ...actorColumns(),
    orderNo: text("order_no").notNull(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    status: orderStatusEnum("status").notNull().default("pending"),
    quotedPricePaise: integer("quoted_price_paise").notNull(),
    govtFeePaise: integer("govt_fee_paise"),
    assignedTo: text("assigned_to").references(() => user.id, { onDelete: "set null" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notes: text("notes"),
  },
  (table) => [
    uniqueIndex("orders_order_no_idx").on(table.orderNo),
    index("orders_client_id_idx").on(table.clientId),
    index("orders_assigned_to_idx").on(table.assignedTo),
    index("orders_status_idx").on(table.status),
    index("orders_due_at_idx").on(table.dueAt),
  ],
);

export const orderTasks = pgTable(
  "order_tasks",
  {
    ...baseColumns(),
    ...actorColumns(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    assignedTo: text("assigned_to").references(() => user.id, { onDelete: "set null" }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    status: orderTaskStatusEnum("status").notNull().default("pending"),
    sort: integer("sort").notNull().default(0),
  },
  (table) => [index("order_tasks_order_id_idx").on(table.orderId)],
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  client: one(clients, { fields: [orders.clientId], references: [clients.id] }),
  service: one(services, { fields: [orders.serviceId], references: [services.id] }),
  assignee: one(user, { fields: [orders.assignedTo], references: [user.id] }),
  tasks: many(orderTasks),
}));

export const orderTasksRelations = relations(orderTasks, ({ one }) => ({
  order: one(orders, { fields: [orderTasks.orderId], references: [orders.id] }),
  assignee: one(user, { fields: [orderTasks.assignedTo], references: [user.id] }),
}));
