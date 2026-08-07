import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { actorColumns, baseColumns } from "@/db/schema/_shared";
import { user } from "@/db/schema/auth-schema";
import { services } from "@/db/schema/catalog";
import { clients } from "@/db/schema/clients";
import { orders } from "@/db/schema/orders";
import { referralPartners } from "@/db/schema/referral-partners";

export const enquirySourceEnum = pgEnum("enquiry_source", [
  "whatsapp",
  "website",
  "meta_ads",
  "google",
  "referral",
  "walk_in",
  "other",
]);

export const enquiryStatusEnum = pgEnum("enquiry_status", [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
]);

export const enquiryFollowupChannelEnum = pgEnum("enquiry_followup_channel", [
  "call",
  "whatsapp",
  "email",
  "meeting",
]);

/** Who ends up owning a logged follow-up: kept by the same executive, or handed to another one. */
export const enquiryFollowupHandoffEnum = pgEnum("enquiry_followup_handoff", [
  "self",
  "one_time",
  "permanent",
]);

export const enquiries = pgTable(
  "enquiries",
  {
    ...baseColumns(),
    ...actorColumns(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    address: text("address"),
    city: text("city"),
    // Franchise territory routing (spec extension, ADR 0001) keys off this — enquiries previously
    // only carried free-text city, with no structured field to match against pincode allocations.
    pincode: text("pincode"),
    source: enquirySourceEnum("source").notNull(),
    serviceInterestedId: uuid("service_interested_id").references(() => services.id, {
      onDelete: "set null",
    }),
    status: enquiryStatusEnum("status").notNull().default("new"),
    lostReason: text("lost_reason"),
    assignedTo: text("assigned_to").references(() => user.id, { onDelete: "set null" }),
    // Set when source = "referral" — the associate who referred this enquiry (ADR 0001).
    referralPartnerId: uuid("referral_partner_id").references(() => referralPartners.id, {
      onDelete: "set null",
    }),
    nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
    // Who currently owns the *next* follow-up action. Null means "same as assignedTo" — set to a
    // different executive by a one-time handoff (Followup dialog), left null by a permanent
    // transfer (which instead updates assignedTo itself) or a self follow-up.
    nextFollowUpAssignedTo: text("next_follow_up_assigned_to").references(() => user.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    // Extends spec 4.1: tracks which client a won enquiry became, so conversion is traceable
    // after the fact. Documented in README under Assumptions.
    convertedClientId: uuid("converted_client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    // Set alongside convertedClientId when the Sales action creates an order in the same
    // transaction as the client (README Assumptions).
    convertedOrderId: uuid("converted_order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    uniqueIndex("enquiries_phone_idx").on(table.phone),
    index("enquiries_assigned_to_idx").on(table.assignedTo),
    index("enquiries_next_follow_up_assigned_to_idx").on(table.nextFollowUpAssignedTo),
    index("enquiries_status_idx").on(table.status),
    index("enquiries_next_follow_up_at_idx").on(table.nextFollowUpAt),
    index("enquiries_pincode_idx").on(table.pincode),
  ],
);

export const enquiryFollowups = pgTable(
  "enquiry_followups",
  {
    ...baseColumns(),
    ...actorColumns(),
    enquiryId: uuid("enquiry_id")
      .notNull()
      .references(() => enquiries.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    channel: enquiryFollowupChannelEnum("channel").notNull(),
    summary: text("summary").notNull(),
    followedUpAt: timestamp("followed_up_at", { withTimezone: true }).notNull().defaultNow(),
    nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
    // What handoff decision was made when this follow-up was logged, for audit history.
    handoffType: enquiryFollowupHandoffEnum("handoff_type").notNull().default("self"),
    handoffTo: text("handoff_to").references(() => user.id, { onDelete: "set null" }),
  },
  (table) => [index("enquiry_followups_enquiry_id_idx").on(table.enquiryId)],
);

export const enquiriesRelations = relations(enquiries, ({ one, many }) => ({
  assignee: one(user, { fields: [enquiries.assignedTo], references: [user.id] }),
  nextFollowUpAssignee: one(user, {
    fields: [enquiries.nextFollowUpAssignedTo],
    references: [user.id],
  }),
  serviceInterested: one(services, {
    fields: [enquiries.serviceInterestedId],
    references: [services.id],
  }),
  convertedClient: one(clients, {
    fields: [enquiries.convertedClientId],
    references: [clients.id],
  }),
  convertedOrder: one(orders, {
    fields: [enquiries.convertedOrderId],
    references: [orders.id],
  }),
  referralPartner: one(referralPartners, {
    fields: [enquiries.referralPartnerId],
    references: [referralPartners.id],
  }),
  followups: many(enquiryFollowups),
}));

export const enquiryFollowupsRelations = relations(enquiryFollowups, ({ one }) => ({
  enquiry: one(enquiries, { fields: [enquiryFollowups.enquiryId], references: [enquiries.id] }),
  user: one(user, { fields: [enquiryFollowups.userId], references: [user.id] }),
  handoffToUser: one(user, {
    fields: [enquiryFollowups.handoffTo],
    references: [user.id],
  }),
}));
