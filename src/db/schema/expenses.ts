import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { actorColumns, baseColumns } from "@/db/schema/_shared";
import { orders } from "@/db/schema/orders";

export const expenses = pgTable(
  "expenses",
  {
    ...baseColumns(),
    ...actorColumns(),
    date: timestamp("date", { withTimezone: true }).notNull(),
    category: text("category").notNull(),
    description: text("description"),
    amountPaise: integer("amount_paise").notNull(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  },
  (table) => [
    index("expenses_date_idx").on(table.date),
    index("expenses_order_id_idx").on(table.orderId),
    index("expenses_category_idx").on(table.category),
  ],
);

export const expensesRelations = relations(expenses, ({ one }) => ({
  order: one(orders, { fields: [expenses.orderId], references: [orders.id] }),
}));
