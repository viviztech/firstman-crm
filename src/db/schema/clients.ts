import { relations, sql } from "drizzle-orm";
import { boolean, index, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { actorColumns, baseColumns } from "@/db/schema/_shared";
import { user } from "@/db/schema/auth-schema";
import { referralPartners } from "@/db/schema/referral-partners";

export const clientTypeEnum = pgEnum("client_type", ["individual", "business"]);

export const clients = pgTable(
  "clients",
  {
    ...baseColumns(),
    ...actorColumns(),
    type: clientTypeEnum("type").notNull().default("individual"),
    name: text("name").notNull(),
    businessName: text("business_name"),
    // Customer Identification Number, format FM<year><6-digit seq> (ADR 0002/0003). Nullable —
    // clients created before this shipped keep no CIN (prospective-only, no backfill).
    cin: text("cin"),
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
    // Copied from enquiries.referralPartnerId on conversion (ADR 0001) — referralSource stays as
    // free-text for backward compatibility/display.
    referralPartnerId: uuid("referral_partner_id").references(() => referralPartners.id, {
      onDelete: "set null",
    }),
    // Manual flag for now — spec 4.8 defers the inbound "STOP" webhook to a later phase.
    whatsappOptedOut: boolean("whatsapp_opted_out").notNull().default(false),
  },
  (table) => [
    // Unique among non-deleted rows only — a soft-deleted client's phone/email/CIN must not
    // block a genuinely new client from reusing it (ADR 0002/0003).
    uniqueIndex("clients_phone_unique_idx").on(table.phone).where(sql`${table.deletedAt} is null`),
    uniqueIndex("clients_email_unique_idx")
      .on(table.email)
      .where(sql`${table.email} is not null and ${table.deletedAt} is null`),
    uniqueIndex("clients_cin_unique_idx")
      .on(table.cin)
      .where(sql`${table.cin} is not null and ${table.deletedAt} is null`),
    index("clients_assigned_to_idx").on(table.assignedTo),
    index("clients_name_idx").on(table.name),
    index("clients_pincode_idx").on(table.pincode),
  ],
);

export const clientsRelations = relations(clients, ({ one }) => ({
  assignee: one(user, {
    fields: [clients.assignedTo],
    references: [user.id],
  }),
  referralPartner: one(referralPartners, {
    fields: [clients.referralPartnerId],
    references: [referralPartners.id],
  }),
}));
