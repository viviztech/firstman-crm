import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { actorColumns, baseColumns } from "@/db/schema/_shared";
import { user } from "@/db/schema/auth-schema";
import { workLocations } from "@/db/schema/hr";

export const leaveUnitEnum = pgEnum("leave_unit", ["day", "half_day"]);
export const leaveRequestStatusEnum = pgEnum("leave_request_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);
export const leaveDayPortionEnum = pgEnum("leave_day_portion", [
  "full_day",
  "first_half",
  "second_half",
]);
export const leaveLedgerKindEnum = pgEnum("leave_ledger_kind", [
  "entitlement",
  "adjustment",
  "request",
  "reversal",
]);
export const leaveHistoryEventEnum = pgEnum("leave_history_event", [
  "submitted",
  "approved",
  "rejected",
  "cancelled",
]);

export const leaveTypes = pgTable(
  "leave_types",
  {
    ...baseColumns(),
    ...actorColumns(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    isPaid: boolean("is_paid").notNull().default(true),
    unit: leaveUnitEnum("unit").notNull().default("day"),
    allowCarryForward: boolean("allow_carry_forward").notNull().default(false),
    maxCarryForwardHalfDays: integer("max_carry_forward_half_days"),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    uniqueIndex("leave_types_code_idx").on(table.code),
    index("leave_types_active_idx").on(table.isActive),
  ],
);

export const holidayCalendars = pgTable(
  "holiday_calendars",
  {
    ...baseColumns(),
    ...actorColumns(),
    name: text("name").notNull(),
    workLocationId: uuid("work_location_id").references(() => workLocations.id, {
      onDelete: "cascade",
    }),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [uniqueIndex("holiday_calendars_location_idx").on(table.workLocationId)],
);

export const holidays = pgTable(
  "holidays",
  {
    ...baseColumns(),
    ...actorColumns(),
    calendarId: uuid("calendar_id")
      .notNull()
      .references(() => holidayCalendars.id, { onDelete: "cascade" }),
    holidayDate: date("holiday_date").notNull(),
    name: text("name").notNull(),
  },
  (table) => [
    uniqueIndex("holidays_calendar_date_idx").on(table.calendarId, table.holidayDate),
    index("holidays_date_idx").on(table.holidayDate),
  ],
);

export const leavePolicyAssignments = pgTable(
  "leave_policy_assignments",
  {
    ...baseColumns(),
    ...actorColumns(),
    employeeUserId: text("employee_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    leaveTypeId: uuid("leave_type_id")
      .notNull()
      .references(() => leaveTypes.id, { onDelete: "cascade" }),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    annualEntitlementHalfDays: integer("annual_entitlement_half_days").notNull(),
  },
  (table) => [
    uniqueIndex("leave_policy_employee_type_from_idx").on(
      table.employeeUserId,
      table.leaveTypeId,
      table.effectiveFrom,
    ),
  ],
);

export const leaveEntitlementStates = pgTable(
  "leave_entitlement_states",
  {
    ...baseColumns(),
    policyAssignmentId: uuid("policy_assignment_id")
      .notNull()
      .references(() => leavePolicyAssignments.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    grantedHalfDays: integer("granted_half_days").notNull().default(0),
    revision: integer("revision").notNull().default(0),
  },
  (table) => [
    uniqueIndex("leave_entitlement_states_policy_year_idx").on(
      table.policyAssignmentId,
      table.year,
    ),
  ],
);

export const leaveCarryForwardStates = pgTable(
  "leave_carry_forward_states",
  {
    ...baseColumns(),
    employeeUserId: text("employee_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    leaveTypeId: uuid("leave_type_id")
      .notNull()
      .references(() => leaveTypes.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    grantedHalfDays: integer("granted_half_days").notNull().default(0),
    revision: integer("revision").notNull().default(0),
  },
  (table) => [
    uniqueIndex("leave_carry_forward_states_employee_type_year_idx").on(
      table.employeeUserId,
      table.leaveTypeId,
      table.year,
    ),
  ],
);

export const leaveRequests = pgTable(
  "leave_requests",
  {
    ...baseColumns(),
    ...actorColumns(),
    employeeUserId: text("employee_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    leaveTypeId: uuid("leave_type_id")
      .notNull()
      .references(() => leaveTypes.id, { onDelete: "restrict" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    dayPortion: leaveDayPortionEnum("day_portion").notNull().default("full_day"),
    requestedHalfDays: integer("requested_half_days").notNull(),
    reason: text("reason").notNull(),
    status: leaveRequestStatusEnum("status").notNull().default("pending"),
    currentApproverUserId: text("current_approver_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: text("decided_by").references(() => user.id, { onDelete: "set null" }),
    decisionNote: text("decision_note"),
  },
  (table) => [
    index("leave_requests_employee_status_dates_idx").on(
      table.employeeUserId,
      table.status,
      table.startDate,
      table.endDate,
    ),
    index("leave_requests_approver_status_idx").on(table.currentApproverUserId, table.status),
  ],
);

export const leaveLedger = pgTable(
  "leave_ledger",
  {
    ...baseColumns(),
    ...actorColumns(),
    employeeUserId: text("employee_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    leaveTypeId: uuid("leave_type_id")
      .notNull()
      .references(() => leaveTypes.id, { onDelete: "restrict" }),
    year: integer("year").notNull(),
    amountHalfDays: integer("amount_half_days").notNull(),
    kind: leaveLedgerKindEnum("kind").notNull(),
    reference: text("reference").notNull(),
    note: text("note"),
  },
  (table) => [
    uniqueIndex("leave_ledger_reference_idx").on(table.reference),
    index("leave_ledger_employee_type_year_idx").on(
      table.employeeUserId,
      table.leaveTypeId,
      table.year,
    ),
  ],
);

export const leaveRequestHistory = pgTable(
  "leave_request_history",
  {
    ...baseColumns(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => leaveRequests.id, { onDelete: "cascade" }),
    event: leaveHistoryEventEnum("event").notNull(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    note: text("note"),
  },
  (table) => [index("leave_request_history_request_idx").on(table.requestId, table.createdAt)],
);

export const leaveRequestsRelations = relations(leaveRequests, ({ one, many }) => ({
  employee: one(user, { fields: [leaveRequests.employeeUserId], references: [user.id] }),
  leaveType: one(leaveTypes, { fields: [leaveRequests.leaveTypeId], references: [leaveTypes.id] }),
  history: many(leaveRequestHistory),
}));

export const leaveRequestHistoryRelations = relations(leaveRequestHistory, ({ one }) => ({
  request: one(leaveRequests, {
    fields: [leaveRequestHistory.requestId],
    references: [leaveRequests.id],
  }),
}));
