import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { actorColumns, baseColumns } from "@/db/schema/_shared";
import { user } from "@/db/schema/auth-schema";
import { services } from "@/db/schema/catalog";
import { clients } from "@/db/schema/clients";

export const leadSourceEnum = pgEnum("lead_source", [
  "whatsapp",
  "website",
  "meta_ads",
  "google",
  "referral",
  "walk_in",
  "other",
]);

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
]);

export const leadFollowupChannelEnum = pgEnum("lead_followup_channel", [
  "call",
  "whatsapp",
  "email",
  "meeting",
]);

export const leads = pgTable(
  "leads",
  {
    ...baseColumns(),
    ...actorColumns(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    city: text("city"),
    source: leadSourceEnum("source").notNull(),
    serviceInterestedId: uuid("service_interested_id").references(() => services.id, {
      onDelete: "set null",
    }),
    status: leadStatusEnum("status").notNull().default("new"),
    lostReason: text("lost_reason"),
    assignedTo: text("assigned_to").references(() => user.id, { onDelete: "set null" }),
    nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
    notes: text("notes"),
    // Extends spec 4.1: tracks which client a won lead became, so conversion is traceable
    // after the fact. Documented in README under Assumptions.
    convertedClientId: uuid("converted_client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    uniqueIndex("leads_phone_idx").on(table.phone),
    index("leads_assigned_to_idx").on(table.assignedTo),
    index("leads_status_idx").on(table.status),
    index("leads_next_follow_up_at_idx").on(table.nextFollowUpAt),
  ],
);

export const leadFollowups = pgTable(
  "lead_followups",
  {
    ...baseColumns(),
    ...actorColumns(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    channel: leadFollowupChannelEnum("channel").notNull(),
    summary: text("summary").notNull(),
    followedUpAt: timestamp("followed_up_at", { withTimezone: true }).notNull().defaultNow(),
    nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
  },
  (table) => [index("lead_followups_lead_id_idx").on(table.leadId)],
);

export const leadsRelations = relations(leads, ({ one, many }) => ({
  assignee: one(user, { fields: [leads.assignedTo], references: [user.id] }),
  serviceInterested: one(services, {
    fields: [leads.serviceInterestedId],
    references: [services.id],
  }),
  convertedClient: one(clients, { fields: [leads.convertedClientId], references: [clients.id] }),
  followups: many(leadFollowups),
}));

export const leadFollowupsRelations = relations(leadFollowups, ({ one }) => ({
  lead: one(leads, { fields: [leadFollowups.leadId], references: [leads.id] }),
  user: one(user, { fields: [leadFollowups.userId], references: [user.id] }),
}));
