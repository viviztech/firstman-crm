import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { actorColumns, baseColumns } from "@/db/schema/_shared";
import { user } from "@/db/schema/auth-schema";
import { services } from "@/db/schema/catalog";

/**
 * Orthogonal to `role` (spec 3): a user is still e.g. role=executive, but employeeType
 * decides whether they're scoped by assignedTo (internal) or by allocated pincode
 * territory (franchise). Kept off the better-auth-owned `user` table — see ADR 0001.
 */
export const employeeTypeEnum = pgEnum("employee_type", ["internal", "franchise"]);

/**
 * A second axis orthogonal to both `role` and `employeeType` (ADR 0002): which functional
 * module an executive works — the sales pipeline (enquiries/follow-ups/Sales conversion) or
 * fulfillment of converted jobs (job cards). Nullable: no value means unrestricted, matching
 * the same "absence = unrestricted" rule employeeType/service-assignment already use.
 */
export const staffTeamEnum = pgEnum("staff_team", ["sales", "operations"]);

export const staffProfiles = pgTable("staff_profiles", {
  ...baseColumns(),
  ...actorColumns(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  employeeType: employeeTypeEnum("employee_type").notNull().default("internal"),
  team: staffTeamEnum("team"),
});

export const staffPincodeAllocations = pgTable(
  "staff_pincode_allocations",
  {
    ...baseColumns(),
    ...actorColumns(),
    staffProfileId: uuid("staff_profile_id")
      .notNull()
      .references(() => staffProfiles.id, { onDelete: "cascade" }),
    pincode: text("pincode").notNull(),
  },
  (table) => [
    uniqueIndex("staff_pincode_allocations_profile_pincode_idx").on(
      table.staffProfileId,
      table.pincode,
    ),
    index("staff_pincode_allocations_pincode_idx").on(table.pincode),
  ],
);

export const staffServiceAssignments = pgTable(
  "staff_service_assignments",
  {
    ...baseColumns(),
    ...actorColumns(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("staff_service_assignments_user_service_idx").on(table.userId, table.serviceId),
    index("staff_service_assignments_user_id_idx").on(table.userId),
  ],
);

export const staffProfilesRelations = relations(staffProfiles, ({ one, many }) => ({
  user: one(user, { fields: [staffProfiles.userId], references: [user.id] }),
  pincodeAllocations: many(staffPincodeAllocations),
}));

export const staffPincodeAllocationsRelations = relations(staffPincodeAllocations, ({ one }) => ({
  staffProfile: one(staffProfiles, {
    fields: [staffPincodeAllocations.staffProfileId],
    references: [staffProfiles.id],
  }),
}));

export const staffServiceAssignmentsRelations = relations(staffServiceAssignments, ({ one }) => ({
  user: one(user, { fields: [staffServiceAssignments.userId], references: [user.id] }),
  service: one(services, {
    fields: [staffServiceAssignments.serviceId],
    references: [services.id],
  }),
}));
