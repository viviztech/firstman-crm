import { relations } from "drizzle-orm";
import { boolean, index, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { actorColumns, baseColumns } from "@/db/schema/_shared";

/**
 * Master reference data — states/UTs, districts, pincodes. `states` is a hand-verified,
 * authoritative list (name + GST state code); `districts`/`pincodes` are seeded from the India
 * Post pincode directory (see src/db/seed-data/geography.ts for the source and normalization
 * rules, and README "Assumptions" for known gaps).
 */
export const states = pgTable(
  "states",
  {
    ...baseColumns(),
    ...actorColumns(),
    name: text("name").notNull(),
    // 2-digit GST state code (first two digits of a GSTIN). Nullable — not every entity here
    // necessarily has one assigned, though all 36 current states/UTs do.
    gstCode: text("gst_code"),
    isUnionTerritory: boolean("is_union_territory").notNull().default(false),
  },
  (table) => [
    uniqueIndex("states_name_idx").on(table.name),
    uniqueIndex("states_gst_code_idx").on(table.gstCode),
  ],
);

export const districts = pgTable(
  "districts",
  {
    ...baseColumns(),
    ...actorColumns(),
    stateId: uuid("state_id")
      .notNull()
      .references(() => states.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
  },
  (table) => [
    uniqueIndex("districts_state_name_idx").on(table.stateId, table.name),
    index("districts_state_id_idx").on(table.stateId),
  ],
);

export const pincodes = pgTable(
  "pincodes",
  {
    ...baseColumns(),
    ...actorColumns(),
    pincode: text("pincode").notNull(),
    districtId: uuid("district_id")
      .notNull()
      .references(() => districts.id, { onDelete: "restrict" }),
    // Denormalized from districts.stateId — every scoped lookup wants state directly without an
    // extra join, and a pincode never moves between states.
    stateId: uuid("state_id")
      .notNull()
      .references(() => states.id, { onDelete: "restrict" }),
    city: text("city").notNull(),
  },
  (table) => [
    uniqueIndex("pincodes_pincode_idx").on(table.pincode),
    index("pincodes_district_id_idx").on(table.districtId),
    index("pincodes_state_id_idx").on(table.stateId),
  ],
);

export const statesRelations = relations(states, ({ many }) => ({
  districts: many(districts),
  pincodes: many(pincodes),
}));

export const districtsRelations = relations(districts, ({ one, many }) => ({
  state: one(states, { fields: [districts.stateId], references: [states.id] }),
  pincodes: many(pincodes),
}));

export const pincodesRelations = relations(pincodes, ({ one }) => ({
  district: one(districts, { fields: [pincodes.districtId], references: [districts.id] }),
  state: one(states, { fields: [pincodes.stateId], references: [states.id] }),
}));
