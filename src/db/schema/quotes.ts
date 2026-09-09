import { relations } from "drizzle-orm";
import {
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
import { services } from "@/db/schema/catalog";
import { enquiries } from "@/db/schema/enquiries";

export type QuoteLineItem = {
  label: string;
  qty: number;
  ratePaise: number;
  amountPaise: number;
};

/** The client's own response to a sent quote, captured from the signed public response link
 *  (Option A of the quote-approval feature) — never edited by staff directly. */
export const quoteClientResponseEnum = pgEnum("quote_client_response", [
  "pending",
  "approved",
  "negotiating",
]);

/**
 * A generated, non-binding fee estimate sent to an enquirer as soon as their enquiry names an
 * interested service (ADR 0010) — distinct from `invoices` (a real invoice tied to a client and
 * an order created at Sales conversion). Client identity and the line-item breakdown are
 * snapshotted at generation time so a later price/catalog edit never rewrites a quote someone
 * already received.
 */
export const quotes = pgTable(
  "quotes",
  {
    ...baseColumns(),
    ...actorColumns(),
    quoteNo: text("quote_no").notNull(),
    enquiryId: uuid("enquiry_id")
      .notNull()
      .references(() => enquiries.id, { onDelete: "cascade" }),
    clientName: text("client_name").notNull(),
    clientPhone: text("client_phone").notNull(),
    clientEmail: text("client_email"),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    serviceName: text("service_name").notNull(),
    // Free-text, mirrors enquiries.state — null when the enquiry carried no state, in which case
    // lineItems falls back to the service's flat base/govt fee (service-pricing.ts).
    stateName: text("state_name"),
    // Snapshotted from enquiries.numberOfDirectors — drives the qty on perDirector line items.
    numberOfDirectors: integer("number_of_directors"),
    // Snapshotted from enquiries.capitalAmountPaise — drives the qty on perLakhCapital line items.
    capitalAmountPaise: integer("capital_amount_paise"),
    lineItems: jsonb("line_items").$type<QuoteLineItem[]>().notNull(),
    // Sum of all line items before GST (fee components only — GST is never charged on statutory
    // government fees/stamp duty, only on FirstMan's own Professional fee, see quotes.ts).
    subtotalPaise: integer("subtotal_paise").notNull(),
    gstRate: integer("gst_rate").notNull().default(0),
    gstAmountPaise: integer("gst_amount_paise").notNull().default(0),
    totalPaise: integer("total_paise").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    clientResponse: quoteClientResponseEnum("client_response").notNull().default("pending"),
    clientResponseAt: timestamp("client_response_at", { withTimezone: true }),
    // Free-text from the client when they pick "Request changes" on the response page.
    clientResponseNote: text("client_response_note"),
  },
  (table) => [
    uniqueIndex("quotes_quote_no_idx").on(table.quoteNo),
    index("quotes_enquiry_id_idx").on(table.enquiryId),
  ],
);

export const quotesRelations = relations(quotes, ({ one }) => ({
  enquiry: one(enquiries, { fields: [quotes.enquiryId], references: [enquiries.id] }),
  service: one(services, { fields: [quotes.serviceId], references: [services.id] }),
}));
