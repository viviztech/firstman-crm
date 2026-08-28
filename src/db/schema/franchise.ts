import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { actorColumns, baseColumns } from "@/db/schema/_shared";
import { user } from "@/db/schema/auth-schema";
import { states } from "@/db/schema/geography";

export const franchiseLevelEnum = pgEnum("franchise_level", [
  "state",
  "parliamentary",
  "assembly",
  "area",
]);

/** Official electoral master. Codes are unique only inside a state. */
export const parliamentaryConstituencies = pgTable(
  "parliamentary_constituencies",
  {
    ...baseColumns(),
    ...actorColumns(),
    stateId: uuid("state_id")
      .notNull()
      .references(() => states.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    sourceUrl: text("source_url"),
    sourceVersion: text("source_version"),
  },
  (table) => [
    uniqueIndex("parliamentary_constituencies_state_code_idx").on(table.stateId, table.code),
    uniqueIndex("parliamentary_constituencies_state_name_idx").on(table.stateId, table.name),
  ],
);

export const assemblyConstituencies = pgTable(
  "assembly_constituencies",
  {
    ...baseColumns(),
    ...actorColumns(),
    stateId: uuid("state_id")
      .notNull()
      .references(() => states.id, { onDelete: "restrict" }),
    parliamentaryConstituencyId: uuid("parliamentary_constituency_id")
      .notNull()
      .references(() => parliamentaryConstituencies.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    sourceUrl: text("source_url"),
    sourceVersion: text("source_version"),
  },
  (table) => [
    uniqueIndex("assembly_constituencies_state_code_idx").on(table.stateId, table.code),
    index("assembly_constituencies_state_name_idx").on(table.stateId, table.name),
    index("assembly_constituencies_pc_idx").on(table.parliamentaryConstituencyId),
  ],
);

/** Editable bridge because India Post and ECI do not publish one canonical national crosswalk. */
export const pincodeConstituencies = pgTable(
  "pincode_constituencies",
  {
    ...baseColumns(),
    ...actorColumns(),
    pincode: text("pincode").notNull(),
    assemblyConstituencyId: uuid("assembly_constituency_id")
      .notNull()
      .references(() => assemblyConstituencies.id, { onDelete: "restrict" }),
    sourceUrl: text("source_url"),
    sourceVersion: text("source_version"),
    isManualOverride: boolean("is_manual_override").notNull().default(false),
  },
  (table) => [
    uniqueIndex("pincode_constituencies_pincode_idx").on(table.pincode),
    index("pincode_constituencies_assembly_idx").on(table.assemblyConstituencyId),
  ],
);

/** One exclusive territory per franchise user and one franchise user per territory. */
export const franchiseTerritories = pgTable(
  "franchise_territories",
  {
    ...baseColumns(),
    ...actorColumns(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "restrict" }),
    level: franchiseLevelEnum("level").notNull(),
    territoryKey: text("territory_key").notNull().unique(),
    stateId: uuid("state_id")
      .notNull()
      .references(() => states.id, { onDelete: "restrict" }),
    parliamentaryConstituencyId: uuid("parliamentary_constituency_id").references(
      () => parliamentaryConstituencies.id,
      { onDelete: "restrict" },
    ),
    assemblyConstituencyId: uuid("assembly_constituency_id").references(
      () => assemblyConstituencies.id,
      { onDelete: "restrict" },
    ),
    pincode: text("pincode"),
    basicRateBps: integer("basic_rate_bps").notNull(),
    additionalRateBps: integer("additional_rate_bps").notNull().default(1000),
    active: boolean("active").notNull().default(true),
  },
  (table) => [
    index("franchise_territories_state_idx").on(table.stateId),
    index("franchise_territories_pc_idx").on(table.parliamentaryConstituencyId),
    index("franchise_territories_ac_idx").on(table.assemblyConstituencyId),
    index("franchise_territories_pincode_idx").on(table.pincode),
  ],
);

export const parliamentaryConstituenciesRelations = relations(
  parliamentaryConstituencies,
  ({ one, many }) => ({
    state: one(states, { fields: [parliamentaryConstituencies.stateId], references: [states.id] }),
    assemblies: many(assemblyConstituencies),
  }),
);

export const assemblyConstituenciesRelations = relations(
  assemblyConstituencies,
  ({ one, many }) => ({
    state: one(states, { fields: [assemblyConstituencies.stateId], references: [states.id] }),
    parliamentaryConstituency: one(parliamentaryConstituencies, {
      fields: [assemblyConstituencies.parliamentaryConstituencyId],
      references: [parliamentaryConstituencies.id],
    }),
    pincodeMappings: many(pincodeConstituencies),
  }),
);

export const pincodeConstituenciesRelations = relations(pincodeConstituencies, ({ one }) => ({
  assemblyConstituency: one(assemblyConstituencies, {
    fields: [pincodeConstituencies.assemblyConstituencyId],
    references: [assemblyConstituencies.id],
  }),
}));

export const franchiseTerritoriesRelations = relations(franchiseTerritories, ({ one }) => ({
  user: one(user, { fields: [franchiseTerritories.userId], references: [user.id] }),
  state: one(states, { fields: [franchiseTerritories.stateId], references: [states.id] }),
  parliamentaryConstituency: one(parliamentaryConstituencies, {
    fields: [franchiseTerritories.parliamentaryConstituencyId],
    references: [parliamentaryConstituencies.id],
  }),
  assemblyConstituency: one(assemblyConstituencies, {
    fields: [franchiseTerritories.assemblyConstituencyId],
    references: [assemblyConstituencies.id],
  }),
}));
