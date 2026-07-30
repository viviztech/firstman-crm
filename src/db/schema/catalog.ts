import { relations } from "drizzle-orm";
import {
  boolean,
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

export const serviceCategoriesRelations = relations(serviceCategories, ({ many }) => ({
  services: many(services),
}));

export const servicesRelations = relations(services, ({ one }) => ({
  category: one(serviceCategories, {
    fields: [services.categoryId],
    references: [serviceCategories.id],
  }),
}));
