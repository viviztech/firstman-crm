import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { actorColumns, baseColumns } from "@/db/schema/_shared";
import { user } from "@/db/schema/auth-schema";

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "half_day",
  "leave",
  "half_day_leave",
  "holiday",
  "week_off",
  "missing_punch",
]);
export const attendanceSourceEnum = pgEnum("attendance_source", [
  "manual",
  "csv",
  "derived",
  "regularization",
]);
export const regularizationStatusEnum = pgEnum("attendance_regularization_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);
export const regularizationEventEnum = pgEnum("attendance_regularization_event", [
  "submitted",
  "approved",
  "rejected",
  "cancelled",
]);
export const attendanceImportStatusEnum = pgEnum("attendance_import_status", [
  "prepared",
  "committed",
]);

export const shifts = pgTable(
  "shifts",
  {
    ...baseColumns(),
    ...actorColumns(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    startTime: time("start_time", { withTimezone: false }).notNull(),
    endTime: time("end_time", { withTimezone: false }).notNull(),
    breakMinutes: integer("break_minutes").notNull().default(0),
    fullDayMinutes: integer("full_day_minutes").notNull(),
    halfDayMinutes: integer("half_day_minutes").notNull(),
    crossesMidnight: boolean("crosses_midnight").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    uniqueIndex("shifts_code_idx").on(table.code),
    index("shifts_active_idx").on(table.isActive),
  ],
);

export const shiftAssignments = pgTable(
  "shift_assignments",
  {
    ...baseColumns(),
    ...actorColumns(),
    employeeUserId: text("employee_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    shiftId: uuid("shift_id")
      .notNull()
      .references(() => shifts.id, { onDelete: "restrict" }),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
  },
  (table) => [
    uniqueIndex("shift_assignments_employee_from_idx").on(
      table.employeeUserId,
      table.effectiveFrom,
    ),
    index("shift_assignments_shift_idx").on(table.shiftId),
  ],
);

export const attendancePeriodLocks = pgTable(
  "attendance_period_locks",
  {
    ...baseColumns(),
    ...actorColumns(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    reason: text("reason").notNull(),
    payrollPeriodReference: text("payroll_period_reference"),
    lockedAt: timestamp("locked_at", { withTimezone: true }).notNull().defaultNow(),
    lockedBy: text("locked_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("attendance_period_locks_range_idx").on(table.periodStart, table.periodEnd),
  ],
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    ...baseColumns(),
    ...actorColumns(),
    employeeUserId: text("employee_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workDate: date("work_date").notNull(),
    shiftId: uuid("shift_id").references(() => shifts.id, { onDelete: "set null" }),
    firstIn: timestamp("first_in", { withTimezone: true }),
    lastOut: timestamp("last_out", { withTimezone: true }),
    workMinutes: integer("work_minutes").notNull().default(0),
    status: attendanceStatusEnum("status").notNull(),
    source: attendanceSourceEnum("source").notNull(),
    note: text("note"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by").references(() => user.id, { onDelete: "set null" }),
    lockReason: text("lock_reason"),
  },
  (table) => [
    uniqueIndex("attendance_records_employee_date_idx").on(table.employeeUserId, table.workDate),
    index("attendance_records_date_status_idx").on(table.workDate, table.status),
  ],
);

export const attendanceRegularizations = pgTable(
  "attendance_regularizations",
  {
    ...baseColumns(),
    ...actorColumns(),
    employeeUserId: text("employee_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workDate: date("work_date").notNull(),
    requestedFirstIn: timestamp("requested_first_in", { withTimezone: true }),
    requestedLastOut: timestamp("requested_last_out", { withTimezone: true }),
    requestedStatus: attendanceStatusEnum("requested_status").notNull(),
    reason: text("reason").notNull(),
    status: regularizationStatusEnum("status").notNull().default("pending"),
    currentApproverUserId: text("current_approver_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: text("decided_by").references(() => user.id, { onDelete: "set null" }),
    decisionNote: text("decision_note"),
  },
  (table) => [
    index("attendance_regularizations_employee_status_idx").on(table.employeeUserId, table.status),
    index("attendance_regularizations_approver_status_idx").on(
      table.currentApproverUserId,
      table.status,
    ),
  ],
);

export const attendanceRegularizationHistory = pgTable(
  "attendance_regularization_history",
  {
    ...baseColumns(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => attendanceRegularizations.id, { onDelete: "cascade" }),
    event: regularizationEventEnum("event").notNull(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    note: text("note"),
  },
  (table) => [index("attendance_regularization_history_request_idx").on(table.requestId)],
);

export const attendanceImportBatches = pgTable("attendance_import_batches", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  actorId: text("actor_id")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  fileSha256: text("file_sha256").notNull(),
  rowCount: integer("row_count").notNull(),
  status: attendanceImportStatusEnum("status").notNull().default("prepared"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  committedAt: timestamp("committed_at", { withTimezone: true }),
});

export const attendanceRecordsRelations = relations(attendanceRecords, ({ one }) => ({
  employee: one(user, { fields: [attendanceRecords.employeeUserId], references: [user.id] }),
  shift: one(shifts, { fields: [attendanceRecords.shiftId], references: [shifts.id] }),
}));
