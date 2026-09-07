import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { actorColumns, baseColumns } from "@/db/schema/_shared";
import { states } from "@/db/schema/geography";

export const recurrenceEnum = pgEnum("recurrence", ["monthly", "quarterly", "yearly"]);

export const serviceRelationTypeEnum = pgEnum("service_relation_type", [
  "upsell",
  "renewal",
  "prerequisite",
]);

export type ChecklistTemplateItem = {
  title: string;
  dayOffset: number;
};

export const serviceVerticals = pgTable("service_verticals", {
  ...baseColumns(),
  ...actorColumns(),
  name: text("name").notNull(),
  sort: integer("sort").notNull().default(0),
});

export const serviceCategories = pgTable(
  "service_categories",
  {
    ...baseColumns(),
    ...actorColumns(),
    verticalId: uuid("vertical_id")
      .notNull()
      .references(() => serviceVerticals.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    sort: integer("sort").notNull().default(0),
  },
  (table) => [index("service_categories_vertical_id_idx").on(table.verticalId)],
);

export const services = pgTable(
  "services",
  {
    ...baseColumns(),
    ...actorColumns(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => serviceCategories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    basePricePaise: integer("base_price_paise").notNull(),
    govtFeePaise: integer("govt_fee_paise"),
    estimatedDays: integer("estimated_days").notNull(),
    isRecurring: boolean("is_recurring").notNull().default(false),
    recurrence: recurrenceEnum("recurrence"),
    checklistTemplate: jsonb("checklist_template").$type<ChecklistTemplateItem[]>().notNull(),
    requiredDocuments: jsonb("required_documents").$type<string[]>().notNull(),
  },
  (table) => [uniqueIndex("services_slug_idx").on(table.slug)],
);

/**
 * One row per price CHANGE, not per service — the service row itself covers "price since
 * creation" until the first history row exists. Inserted by updateService() only when
 * basePricePaise/govtFeePaise actually differ from the current row.
 */
export const servicePriceHistory = pgTable(
  "service_price_history",
  {
    ...baseColumns(),
    ...actorColumns(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    basePricePaise: integer("base_price_paise").notNull(),
    govtFeePaise: integer("govt_fee_paise"),
  },
  (table) => [index("service_price_history_service_id_idx").on(table.serviceId)],
);

/**
 * Directional: serviceId -> relatedServiceId reads as "serviceId leads to / requires
 * relatedServiceId" (relationType says how). serviceId !== relatedServiceId is enforced in
 * services/catalog.ts, not here — a cross-field inequality against a dynamic set isn't a natural
 * DB constraint here and every write already goes through setServiceRelations().
 */
export const serviceRelations = pgTable(
  "service_relations",
  {
    ...baseColumns(),
    ...actorColumns(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    relatedServiceId: uuid("related_service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    relationType: serviceRelationTypeEnum("relation_type").notNull(),
  },
  (table) => [
    uniqueIndex("service_relations_pair_idx").on(table.serviceId, table.relatedServiceId),
    index("service_relations_service_id_idx").on(table.serviceId),
  ],
);

export type ServiceStateFeeComponent = {
  label: string;
  /** Rate for one unit — the total per line is this × quantity at quote time (qty combines
   *  whichever of perDirector/perLakhCapital below apply), mirroring InvoiceLineItem's rate/qty
   *  split. */
  amountPaise: number;
  /** DSC/DIN-style components that scale with headcount rather than being a flat one-time fee. */
  perDirector: boolean;
  /** MOA/AOA-style stamp duty that scales with authorized capital — rate is per ₹1,00,000
   *  (1 lakh) of capital, rounded up to the next whole lakh. */
  perLakhCapital: boolean;
};

/**
 * State-specific fee breakdown for a service (e.g. Pvt Ltd registration's Name Approval/DSC/
 * DIN/SPICe/MOA/AOA components, which differ by state — stamp duty on MOA/AOA in particular).
 * One row per (serviceId, stateId); a service with no row for a given state falls back to its
 * flat basePricePaise/govtFeePaise (computeServiceQuote in service-pricing.ts). feeComponents
 * is jsonb rather than exploded into rows, matching checklistTemplate/requiredDocuments above.
 */
export const serviceStatePrices = pgTable(
  "service_state_prices",
  {
    ...baseColumns(),
    ...actorColumns(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    stateId: uuid("state_id")
      .notNull()
      .references(() => states.id, { onDelete: "cascade" }),
    feeComponents: jsonb("fee_components").$type<ServiceStateFeeComponent[]>().notNull(),
  },
  (table) => [
    uniqueIndex("service_state_prices_service_state_idx").on(table.serviceId, table.stateId),
    index("service_state_prices_service_id_idx").on(table.serviceId),
  ],
);

export const serviceStatePricesRelations = relations(serviceStatePrices, ({ one }) => ({
  service: one(services, { fields: [serviceStatePrices.serviceId], references: [services.id] }),
  state: one(states, { fields: [serviceStatePrices.stateId], references: [states.id] }),
}));

export const serviceVerticalsRelations = relations(serviceVerticals, ({ many }) => ({
  categories: many(serviceCategories),
}));

export const serviceCategoriesRelations = relations(serviceCategories, ({ one, many }) => ({
  vertical: one(serviceVerticals, {
    fields: [serviceCategories.verticalId],
    references: [serviceVerticals.id],
  }),
  services: many(services),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  category: one(serviceCategories, {
    fields: [services.categoryId],
    references: [serviceCategories.id],
  }),
  priceHistory: many(servicePriceHistory),
  statePrices: many(serviceStatePrices),
}));

export const servicePriceHistoryRelations = relations(servicePriceHistory, ({ one }) => ({
  service: one(services, { fields: [servicePriceHistory.serviceId], references: [services.id] }),
}));

export const serviceRelationsRelations = relations(serviceRelations, ({ one }) => ({
  service: one(services, {
    fields: [serviceRelations.serviceId],
    references: [services.id],
    relationName: "serviceRelationsFromService",
  }),
  relatedService: one(services, {
    fields: [serviceRelations.relatedServiceId],
    references: [services.id],
    relationName: "serviceRelationsToRelatedService",
  }),
}));
