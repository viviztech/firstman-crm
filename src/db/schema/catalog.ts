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

export const serviceCategories = pgTable("service_categories", {
  ...baseColumns(),
  ...actorColumns(),
  name: text("name").notNull(),
  sort: integer("sort").notNull().default(0),
});

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

export const serviceCategoriesRelations = relations(serviceCategories, ({ many }) => ({
  services: many(services),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  category: one(serviceCategories, {
    fields: [services.categoryId],
    references: [serviceCategories.id],
  }),
  priceHistory: many(servicePriceHistory),
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
