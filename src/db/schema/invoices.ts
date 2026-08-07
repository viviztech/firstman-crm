import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { actorColumns, baseColumns } from "@/db/schema/_shared";
import { clients } from "@/db/schema/clients";
import { orders } from "@/db/schema/orders";

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
]);

/** proforma: issued at Sales conversion to collect advance payment, not a fiscal document.
 *  tax: the final GST invoice, auto-generated once the order is completed and its proforma is paid in full. */
export const invoiceKindEnum = pgEnum("invoice_kind", ["proforma", "tax"]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "upi",
  "bank_transfer",
  "cash",
  "card",
  "cheque",
]);

export type InvoiceLineItem = {
  description: string;
  qty: number;
  ratePaise: number;
  amountPaise: number;
};

export const invoices = pgTable(
  "invoices",
  {
    ...baseColumns(),
    ...actorColumns(),
    invoiceNo: text("invoice_no").notNull(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    lineItems: jsonb("line_items").$type<InvoiceLineItem[]>().notNull(),
    subtotalPaise: integer("subtotal_paise").notNull(),
    gstRate: integer("gst_rate").notNull().default(0),
    gstAmountPaise: integer("gst_amount_paise").notNull(),
    totalPaise: integer("total_paise").notNull(),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    kind: invoiceKindEnum("kind").notNull().default("tax"),
    /** Set only on a `tax` invoice — the proforma it was auto-generated from once the order
     *  completed and that proforma was paid in full. */
    proformaInvoiceId: uuid("proforma_invoice_id").references((): AnyPgColumn => invoices.id, {
      onDelete: "set null",
    }),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("invoices_invoice_no_idx").on(table.invoiceNo),
    index("invoices_client_id_idx").on(table.clientId),
    index("invoices_order_id_idx").on(table.orderId),
    index("invoices_status_idx").on(table.status),
    index("invoices_due_date_idx").on(table.dueDate),
    index("invoices_kind_idx").on(table.kind),
  ],
);

export const payments = pgTable(
  "payments",
  {
    ...baseColumns(),
    ...actorColumns(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "restrict" }),
    amountPaise: integer("amount_paise").notNull(),
    method: paymentMethodEnum("method").notNull(),
    reference: text("reference"),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("payments_invoice_id_idx").on(table.invoiceId)],
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  order: one(orders, { fields: [invoices.orderId], references: [orders.id] }),
  payments: many(payments),
  proformaInvoice: one(invoices, {
    fields: [invoices.proformaInvoiceId],
    references: [invoices.id],
    relationName: "proformaToTax",
  }),
  taxInvoice: many(invoices, { relationName: "proformaToTax" }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
}));
