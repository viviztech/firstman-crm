import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { actorColumns, baseColumns } from "@/db/schema/_shared";
import { user } from "@/db/schema/auth-schema";
import { services } from "@/db/schema/catalog";
import { departments, designations, workLocations } from "@/db/schema/hr";

/**
 * Orthogonal to `role` (spec 3): a user is still e.g. role=executive, but employeeType
 * decides whether they're scoped by assignedTo (internal) or by allocated pincode
 * territory (franchise). Kept off the better-auth-owned `user` table — see ADR 0001.
 * `associate` (ADR 0006) is scoped identically to `internal` (see isAssignedEmployee in
 * lib/scope.ts) — it only changes the portal-role label, not visibility.
 */
export const employeeTypeEnum = pgEnum("employee_type", ["internal", "franchise", "associate"]);

/**
 * A second axis orthogonal to both `role` and `employeeType` (ADR 0002): which functional
 * module an executive works — the sales pipeline (enquiries/follow-ups/Sales conversion) or
 * fulfillment of converted jobs (job cards). Nullable: no value means unrestricted, matching
 * the same "absence = unrestricted" rule employeeType/service-assignment already use.
 * `backoffice`/`workforce` (ADR 0006) and `franchise` (ADR 0008) are manager-only values that
 * pick a dashboard workspace — they don't restrict a manager's permissions or nav, unlike
 * `sales`/`operations` on executives.
 */
export const staffTeamEnum = pgEnum("staff_team", [
  "sales",
  "operations",
  "backoffice",
  "workforce",
  "franchise",
]);

export const employmentStatusEnum = pgEnum("employment_status", [
  "draft",
  "active",
  "probation",
  "notice",
  "exited",
]);

export const employmentCategoryEnum = pgEnum("employment_category", [
  "permanent",
  "probationer",
  "contract",
  "intern",
  "consultant",
]);

export const staffProfiles = pgTable(
  "staff_profiles",
  {
    ...baseColumns(),
    ...actorColumns(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    employeeType: employeeTypeEnum("employee_type").notNull().default("internal"),
    team: staffTeamEnum("team"),
    employeeCode: text("employee_code").unique(),
    legalName: text("legal_name"),
    phone: text("phone"),
    personalEmail: text("personal_email"),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    designationId: uuid("designation_id").references(() => designations.id, {
      onDelete: "set null",
    }),
    managerUserId: text("manager_user_id").references(() => user.id, { onDelete: "set null" }),
    workLocationId: uuid("work_location_id").references(() => workLocations.id, {
      onDelete: "set null",
    }),
    employmentStatus: employmentStatusEnum("employment_status").notNull().default("draft"),
    employmentCategory: employmentCategoryEnum("employment_category"),
    joinDate: date("join_date"),
    confirmationDate: date("confirmation_date"),
    noticeStartDate: date("notice_start_date"),
    lastWorkingDate: date("last_working_date"),
    payrollEligible: boolean("payroll_eligible").notNull().default(false),
  },
  (table) => [
    index("staff_profiles_department_idx").on(table.departmentId),
    index("staff_profiles_manager_idx").on(table.managerUserId),
    index("staff_profiles_employment_status_idx").on(table.employmentStatus),
  ],
);

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
  manager: one(user, {
    fields: [staffProfiles.managerUserId],
    references: [user.id],
    relationName: "staffManager",
  }),
  department: one(departments, {
    fields: [staffProfiles.departmentId],
    references: [departments.id],
  }),
  designation: one(designations, {
    fields: [staffProfiles.designationId],
    references: [designations.id],
  }),
  workLocation: one(workLocations, {
    fields: [staffProfiles.workLocationId],
    references: [workLocations.id],
  }),
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
