import { relations } from "drizzle-orm";
import { boolean, index, pgEnum, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { actorColumns, baseColumns } from "@/db/schema/_shared";
import { user } from "@/db/schema/auth-schema";

export const hrCapabilityEnum = pgEnum("hr_capability", ["hr_admin", "payroll_admin"]);

export const departments = pgTable(
  "departments",
  {
    ...baseColumns(),
    ...actorColumns(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    headUserId: text("head_user_id").references(() => user.id, { onDelete: "set null" }),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    uniqueIndex("departments_code_idx").on(table.code),
    index("departments_active_idx").on(table.isActive),
  ],
);

export const designations = pgTable(
  "designations",
  {
    ...baseColumns(),
    ...actorColumns(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    uniqueIndex("designations_code_idx").on(table.code),
    index("designations_active_idx").on(table.isActive),
  ],
);

export const workLocations = pgTable(
  "work_locations",
  {
    ...baseColumns(),
    ...actorColumns(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    address: text("address"),
    state: text("state"),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    uniqueIndex("work_locations_code_idx").on(table.code),
    index("work_locations_active_idx").on(table.isActive),
  ],
);

export const hrCapabilityAssignments = pgTable(
  "hr_capability_assignments",
  {
    ...baseColumns(),
    ...actorColumns(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    capability: hrCapabilityEnum("capability").notNull(),
  },
  (table) => [
    uniqueIndex("hr_capability_assignments_user_capability_idx").on(table.userId, table.capability),
    index("hr_capability_assignments_user_idx").on(table.userId),
  ],
);

export const departmentsRelations = relations(departments, ({ one }) => ({
  head: one(user, { fields: [departments.headUserId], references: [user.id] }),
}));

export const hrCapabilityAssignmentsRelations = relations(hrCapabilityAssignments, ({ one }) => ({
  user: one(user, { fields: [hrCapabilityAssignments.userId], references: [user.id] }),
}));
