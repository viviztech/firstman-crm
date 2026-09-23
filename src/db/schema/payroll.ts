import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { actorColumns, baseColumns } from "@/db/schema/_shared";
import { user } from "@/db/schema/auth-schema";
import { expenses } from "@/db/schema/expenses";

export const salaryComponentTypeEnum = pgEnum("salary_component_type", [
  "earning",
  "deduction",
  "reimbursement",
  "employer_contribution",
]);
export const salaryCalculationModeEnum = pgEnum("salary_calculation_mode", [
  "fixed",
  "percent_of_basic",
]);
export const payrollPeriodStatusEnum = pgEnum("payroll_period_status", [
  "draft",
  "calculated",
  "approved",
  "posted",
  "paid",
]);
export const payrollValidationStatusEnum = pgEnum("payroll_validation_status", [
  "valid",
  "warning",
]);

export const salaryComponents = pgTable(
  "salary_components",
  {
    ...baseColumns(),
    ...actorColumns(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    type: salaryComponentTypeEnum("type").notNull(),
    calculationMode: salaryCalculationModeEnum("calculation_mode").notNull().default("fixed"),
    taxable: boolean("taxable").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [uniqueIndex("salary_components_code_idx").on(table.code)],
);

export const salaryStructures = pgTable(
  "salary_structures",
  {
    ...baseColumns(),
    ...actorColumns(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [uniqueIndex("salary_structures_code_idx").on(table.code)],
);

export const salaryStructureLines = pgTable(
  "salary_structure_lines",
  {
    ...baseColumns(),
    ...actorColumns(),
    structureId: uuid("structure_id")
      .notNull()
      .references(() => salaryStructures.id, { onDelete: "cascade" }),
    componentId: uuid("component_id")
      .notNull()
      .references(() => salaryComponents.id, { onDelete: "restrict" }),
    amountPaise: integer("amount_paise"),
    rateBasisPoints: integer("rate_basis_points"),
  },
  (table) => [
    uniqueIndex("salary_structure_lines_structure_component_idx").on(
      table.structureId,
      table.componentId,
    ),
  ],
);

export const employeeSalaryAssignments = pgTable(
  "employee_salary_assignments",
  {
    ...baseColumns(),
    ...actorColumns(),
    employeeUserId: text("employee_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    structureId: uuid("structure_id")
      .notNull()
      .references(() => salaryStructures.id, { onDelete: "restrict" }),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
  },
  (table) => [
    uniqueIndex("employee_salary_assignments_employee_from_idx").on(
      table.employeeUserId,
      table.effectiveFrom,
    ),
    index("employee_salary_assignments_structure_idx").on(table.structureId),
  ],
);

export const payrollOpeningBalances = pgTable(
  "payroll_opening_balances",
  {
    ...baseColumns(),
    ...actorColumns(),
    year: integer("year").notNull(),
    employeeUserId: text("employee_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    componentId: uuid("component_id")
      .notNull()
      .references(() => salaryComponents.id, { onDelete: "restrict" }),
    amountPaise: integer("amount_paise").notNull(),
  },
  (table) => [
    uniqueIndex("payroll_opening_balances_employee_component_year_idx").on(
      table.employeeUserId,
      table.componentId,
      table.year,
    ),
    index("payroll_opening_balances_year_idx").on(table.year),
  ],
);

export const payrollPeriods = pgTable(
  "payroll_periods",
  {
    ...baseColumns(),
    ...actorColumns(),
    periodMonth: date("period_month").notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    status: payrollPeriodStatusEnum("status").notNull().default("draft"),
    calculationVersion: integer("calculation_version").notNull().default(1),
    calculatedAt: timestamp("calculated_at", { withTimezone: true }),
    calculatedBy: text("calculated_by").references(() => user.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by").references(() => user.id, { onDelete: "set null" }),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    postedBy: text("posted_by").references(() => user.id, { onDelete: "set null" }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paidBy: text("paid_by").references(() => user.id, { onDelete: "set null" }),
    financeExpenseId: uuid("finance_expense_id").references(() => expenses.id, {
      onDelete: "restrict",
    }),
  },
  (table) => [uniqueIndex("payroll_periods_month_idx").on(table.periodMonth)],
);

export const payrollAdjustments = pgTable(
  "payroll_adjustments",
  {
    ...baseColumns(),
    ...actorColumns(),
    periodId: uuid("period_id")
      .notNull()
      .references(() => payrollPeriods.id, { onDelete: "cascade" }),
    employeeUserId: text("employee_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    componentId: uuid("component_id")
      .notNull()
      .references(() => salaryComponents.id, { onDelete: "restrict" }),
    amountPaise: integer("amount_paise").notNull(),
    reason: text("reason").notNull(),
  },
  (table) => [
    index("payroll_adjustments_period_employee_idx").on(table.periodId, table.employeeUserId),
  ],
);

export const payrollEntries = pgTable(
  "payroll_entries",
  {
    ...baseColumns(),
    ...actorColumns(),
    periodId: uuid("period_id")
      .notNull()
      .references(() => payrollPeriods.id, { onDelete: "cascade" }),
    employeeUserId: text("employee_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    employeeCode: text("employee_code").notNull(),
    employeeName: text("employee_name").notNull(),
    designationName: text("designation_name"),
    structureName: text("structure_name").notNull(),
    eligibleHalfDays: integer("eligible_half_days").notNull(),
    paidHalfDays: integer("paid_half_days").notNull(),
    grossPaise: integer("gross_paise").notNull(),
    deductionsPaise: integer("deductions_paise").notNull(),
    reimbursementsPaise: integer("reimbursements_paise").notNull(),
    netPayPaise: integer("net_pay_paise").notNull(),
    employerContributionsPaise: integer("employer_contributions_paise").notNull(),
    totalCostPaise: integer("total_cost_paise").notNull(),
    validationStatus: payrollValidationStatusEnum("validation_status").notNull().default("valid"),
    validationMessages: jsonb("validation_messages").$type<string[]>().notNull().default([]),
    inputSnapshot: jsonb("input_snapshot").$type<Record<string, unknown>>().notNull(),
  },
  (table) => [
    uniqueIndex("payroll_entries_period_employee_idx").on(table.periodId, table.employeeUserId),
  ],
);

export const payrollEntryLines = pgTable(
  "payroll_entry_lines",
  {
    ...baseColumns(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => payrollEntries.id, { onDelete: "cascade" }),
    componentCode: text("component_code").notNull(),
    componentName: text("component_name").notNull(),
    componentType: salaryComponentTypeEnum("component_type").notNull(),
    amountPaise: integer("amount_paise").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
  },
  (table) => [index("payroll_entry_lines_entry_idx").on(table.entryId)],
);

export const payslips = pgTable(
  "payslips",
  {
    ...baseColumns(),
    ...actorColumns(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => payrollEntries.id, { onDelete: "restrict" }),
    storageKey: text("storage_key").notNull(),
    sha256: text("sha256").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("payslips_entry_idx").on(table.entryId)],
);

export const payrollEntriesRelations = relations(payrollEntries, ({ one, many }) => ({
  period: one(payrollPeriods, {
    fields: [payrollEntries.periodId],
    references: [payrollPeriods.id],
  }),
  employee: one(user, { fields: [payrollEntries.employeeUserId], references: [user.id] }),
  lines: many(payrollEntryLines),
  payslip: one(payslips, { fields: [payrollEntries.id], references: [payslips.entryId] }),
}));
