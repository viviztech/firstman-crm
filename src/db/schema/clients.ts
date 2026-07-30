import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { actorColumns, baseColumns } from "@/db/schema/_shared";
import { user } from "@/db/schema/auth-schema";

export const clientTypeEnum = pgEnum("client_type", ["individual", "business"]);

export const clients = pgTable(
  "clients",
  {
    ...baseColumns(),
    ...actorColumns(),
    type: clientTypeEnum("type").notNull().default("individual"),
    name: text("name").notNull(),
    businessName: text("business_name"),
    phone: text("phone").notNull(),
    email: text("email"),
    gstin: text("gstin"),
    pan: text("pan"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    pincode: text("pincode"),
    assignedTo: text("assigned_to").references(() => user.id, { onDelete: "set null" }),
    referralSource: text("referral_source"),
  },
  (table) => [
    index("clients_phone_idx").on(table.phone),
    index("clients_assigned_to_idx").on(table.assignedTo),
    index("clients_name_idx").on(table.name),
  ],
);

export const clientsRelations = relations(clients, ({ one }) => ({
  assignee: one(user, {
    fields: [clients.assignedTo],
    references: [user.id],
  }),
}));
