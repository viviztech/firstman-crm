import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { attendanceRecords } from "@/db/schema/attendance";
import { user } from "@/db/schema/auth-schema";
import { designations, hrCapabilityAssignments } from "@/db/schema/hr";
import { leaveRequests, leaveTypes } from "@/db/schema/leave";
import {
  employeeSalaryAssignments,
  payrollAdjustments,
  payrollEntries,
  payrollEntryLines,
  payrollOpeningBalances,
  payrollPeriods,
  salaryComponents,
  salaryStructureLines,
  salaryStructures,
} from "@/db/schema/payroll";
import { staffProfiles } from "@/db/schema/staff";
import { recordActivity } from "@/services/activity-log";
import { assertHrCapability, type HrActor } from "@/services/hr";
import { lockAttendancePeriod, materializeAttendanceMonth } from "@/services/hr-attendance";
import { calculatePayroll, summarizePayrollYtd } from "@/services/hr-payroll-calculator";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const salaryComponentInputSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2)
    .max(30)
    .regex(/^[A-Z0-9_-]+$/),
  name: z.string().trim().min(2).max(100),
  type: z.enum(["earning", "deduction", "reimbursement", "employer_contribution"]),
  calculationMode: z.enum(["fixed", "percent_of_basic"]),
  taxable: z.boolean(),
  displayOrder: z.coerce.number().int().min(0).max(1000),
});
export const salaryStructureInputSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2)
    .max(30)
    .regex(/^[A-Z0-9_-]+$/),
  name: z.string().trim().min(2).max(100),
});
export const salaryStructureLineInputSchema = z.object({
  structureId: z.string().uuid(),
  componentId: z.string().uuid(),
  amountPaise: z.coerce.number().int().min(0).optional(),
  rateBasisPoints: z.coerce.number().int().min(0).max(100_000).optional(),
});
export const salaryAssignmentInputSchema = z
  .object({
    employeeUserId: z.string().min(1),
    structureId: z.string().uuid(),
    effectiveFrom: z.string().regex(DATE),
    effectiveTo: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(DATE).optional()),
  })
  .refine((v) => !v.effectiveTo || v.effectiveTo >= v.effectiveFrom, {
    path: ["effectiveTo"],
    message: "Effective-to date cannot be earlier.",
  });
export const payrollAdjustmentInputSchema = z.object({
  periodId: z.string().uuid(),
  employeeUserId: z.string().min(1),
  componentId: z.string().uuid(),
  amountPaise: z.coerce.number().int(),
  reason: z.string().trim().min(3).max(500),
});
export const payrollOpeningBalanceInputSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  employeeUserId: z.string().min(1),
  componentId: z.string().uuid(),
  amountPaise: z.coerce.number().int().min(0),
});
export const payrollPeriodInputSchema = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) });

function monthRange(month: string) {
  const [year, monthNo] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year ?? 0, monthNo ?? 1, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, "0")}` };
}
function eachDate(start: string, end: string) {
  const result: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

export async function createSalaryComponent(
  input: z.infer<typeof salaryComponentInputSchema>,
  actor: HrActor,
) {
  await assertHrCapability(actor, "payroll_admin");
  const [row] = await db
    .insert(salaryComponents)
    .values({ ...input, createdBy: actor.id, updatedBy: actor.id })
    .returning();
  return row;
}
export async function createSalaryStructure(
  input: z.infer<typeof salaryStructureInputSchema>,
  actor: HrActor,
) {
  await assertHrCapability(actor, "payroll_admin");
  const [row] = await db
    .insert(salaryStructures)
    .values({ ...input, createdBy: actor.id, updatedBy: actor.id })
    .returning();
  return row;
}
export async function addSalaryStructureLine(
  input: z.infer<typeof salaryStructureLineInputSchema>,
  actor: HrActor,
) {
  await assertHrCapability(actor, "payroll_admin");
  const component = await db.query.salaryComponents.findFirst({
    where: eq(salaryComponents.id, input.componentId),
  });
  if (!component) throw new Error("Salary component not found.");
  if (component.calculationMode === "fixed" && input.amountPaise === undefined)
    throw new Error("Fixed components require an amount.");
  if (component.calculationMode === "percent_of_basic" && input.rateBasisPoints === undefined)
    throw new Error("Percentage components require a rate.");
  const [row] = await db
    .insert(salaryStructureLines)
    .values({
      ...input,
      amountPaise: input.amountPaise ?? null,
      rateBasisPoints: input.rateBasisPoints ?? null,
      createdBy: actor.id,
      updatedBy: actor.id,
    })
    .onConflictDoUpdate({
      target: [salaryStructureLines.structureId, salaryStructureLines.componentId],
      set: {
        amountPaise: input.amountPaise ?? null,
        rateBasisPoints: input.rateBasisPoints ?? null,
        deletedAt: null,
        updatedBy: actor.id,
      },
    })
    .returning();
  return row;
}
export async function assignSalaryStructure(
  input: z.infer<typeof salaryAssignmentInputSchema>,
  actor: HrActor,
) {
  await assertHrCapability(actor, "payroll_admin");
  const overlap = await db.query.employeeSalaryAssignments.findFirst({
    where: and(
      eq(employeeSalaryAssignments.employeeUserId, input.employeeUserId),
      isNull(employeeSalaryAssignments.deletedAt),
      lte(employeeSalaryAssignments.effectiveFrom, input.effectiveTo ?? "9999-12-31"),
      or(
        isNull(employeeSalaryAssignments.effectiveTo),
        gte(employeeSalaryAssignments.effectiveTo, input.effectiveFrom),
      ),
    ),
  });
  if (overlap) throw new Error("Employee already has an overlapping salary assignment.");
  const [row] = await db
    .insert(employeeSalaryAssignments)
    .values({
      ...input,
      effectiveTo: input.effectiveTo ?? null,
      createdBy: actor.id,
      updatedBy: actor.id,
    })
    .returning();
  return row;
}

export async function createPayrollPeriod(month: string, actor: HrActor) {
  await assertHrCapability(actor, "payroll_admin");
  const parsed = payrollPeriodInputSchema.parse({ month });
  const range = monthRange(parsed.month);
  const [row] = await db
    .insert(payrollPeriods)
    .values({
      periodMonth: range.start,
      periodStart: range.start,
      periodEnd: range.end,
      createdBy: actor.id,
      updatedBy: actor.id,
    })
    .returning();
  return row;
}

export async function addPayrollAdjustment(
  input: z.infer<typeof payrollAdjustmentInputSchema>,
  actor: HrActor,
) {
  await assertHrCapability(actor, "payroll_admin");
  const period = await db.query.payrollPeriods.findFirst({
    where: eq(payrollPeriods.id, input.periodId),
  });
  if (!period || !["draft", "calculated"].includes(period.status))
    throw new Error("Adjustments are allowed only before approval.");
  const [row] = await db
    .insert(payrollAdjustments)
    .values({ ...input, createdBy: actor.id, updatedBy: actor.id })
    .returning();
  return row;
}

export async function savePayrollOpeningBalance(
  input: z.infer<typeof payrollOpeningBalanceInputSchema>,
  actor: HrActor,
) {
  await assertHrCapability(actor, "payroll_admin");
  const finalized = await db.query.payrollPeriods.findFirst({
    where: and(
      gte(payrollPeriods.periodMonth, `${input.year}-01-01`),
      lte(payrollPeriods.periodMonth, `${input.year}-12-31`),
      inArray(payrollPeriods.status, ["posted", "paid"]),
      isNull(payrollPeriods.deletedAt),
    ),
    columns: { id: true },
  });
  if (finalized)
    throw new Error("Opening balances are locked after payroll is posted for the year.");
  return db.transaction(async (tx) => {
    const [saved] = await tx
      .insert(payrollOpeningBalances)
      .values({ ...input, createdBy: actor.id, updatedBy: actor.id })
      .onConflictDoUpdate({
        target: [
          payrollOpeningBalances.employeeUserId,
          payrollOpeningBalances.componentId,
          payrollOpeningBalances.year,
        ],
        set: { amountPaise: input.amountPaise, deletedAt: null, updatedBy: actor.id },
      })
      .returning();
    if (!saved) throw new Error("Failed to save opening balance.");
    await recordActivity(
      {
        actorId: actor.id,
        entityType: "payroll_opening_balance",
        entityId: saved.id,
        action: "payroll_opening_balance_saved",
        diff: { year: input.year, employeeUserId: input.employeeUserId },
      },
      tx,
    );
    return saved;
  });
}

function paidUnits(status: string, isPaidLeave: boolean | undefined) {
  if (status === "present" || status === "holiday" || status === "week_off") return 2;
  if (status === "half_day") return 1;
  if (status === "leave") return isPaidLeave ? 2 : 0;
  if (status === "half_day_leave") return isPaidLeave ? 2 : 1;
  return 0;
}

export async function calculatePayrollPeriod(periodId: string, actor: HrActor) {
  await assertHrCapability(actor, "payroll_admin");
  const period = await db.query.payrollPeriods.findFirst({
    where: and(eq(payrollPeriods.id, periodId), isNull(payrollPeriods.deletedAt)),
  });
  if (!period || !["draft", "calculated"].includes(period.status))
    throw new Error("Only a draft payroll can be calculated.");
  if (period.periodEnd > new Date().toISOString().slice(0, 10))
    throw new Error("Payroll cannot be calculated before the period ends.");
  const employees = await db
    .select({
      userId: user.id,
      name: user.name,
      employeeCode: staffProfiles.employeeCode,
      joinDate: staffProfiles.joinDate,
      lastWorkingDate: staffProfiles.lastWorkingDate,
      designationName: designations.name,
    })
    .from(user)
    .innerJoin(staffProfiles, eq(staffProfiles.userId, user.id))
    .leftJoin(designations, eq(staffProfiles.designationId, designations.id))
    .where(
      and(
        eq(staffProfiles.payrollEligible, true),
        inArray(staffProfiles.employmentStatus, ["active", "probation", "notice", "exited"]),
        or(isNull(staffProfiles.joinDate), lte(staffProfiles.joinDate, period.periodEnd)),
        or(
          isNull(staffProfiles.lastWorkingDate),
          gte(staffProfiles.lastWorkingDate, period.periodStart),
        ),
        isNull(staffProfiles.deletedAt),
      ),
    );
  const prepared: Array<{
    entry: typeof payrollEntries.$inferInsert;
    lines: Array<typeof payrollEntryLines.$inferInsert>;
  }> = [];
  for (const employee of employees) {
    await materializeAttendanceMonth(employee.userId, period.periodMonth.slice(0, 7));
    const assignment = await db
      .select({
        structureId: employeeSalaryAssignments.structureId,
        structureName: salaryStructures.name,
      })
      .from(employeeSalaryAssignments)
      .innerJoin(salaryStructures, eq(employeeSalaryAssignments.structureId, salaryStructures.id))
      .where(
        and(
          eq(employeeSalaryAssignments.employeeUserId, employee.userId),
          isNull(employeeSalaryAssignments.deletedAt),
          lte(employeeSalaryAssignments.effectiveFrom, period.periodEnd),
          or(
            isNull(employeeSalaryAssignments.effectiveTo),
            gte(employeeSalaryAssignments.effectiveTo, period.periodStart),
          ),
        ),
      )
      .orderBy(desc(employeeSalaryAssignments.effectiveFrom))
      .limit(1);
    if (!assignment[0]) continue;
    const [components, attendance, leaveRows, adjustments] = await Promise.all([
      db
        .select({
          code: salaryComponents.code,
          name: salaryComponents.name,
          type: salaryComponents.type,
          calculationMode: salaryComponents.calculationMode,
          amountPaise: salaryStructureLines.amountPaise,
          rateBasisPoints: salaryStructureLines.rateBasisPoints,
          displayOrder: salaryComponents.displayOrder,
        })
        .from(salaryStructureLines)
        .innerJoin(salaryComponents, eq(salaryStructureLines.componentId, salaryComponents.id))
        .where(
          and(
            eq(salaryStructureLines.structureId, assignment[0].structureId),
            isNull(salaryStructureLines.deletedAt),
            isNull(salaryComponents.deletedAt),
            eq(salaryComponents.isActive, true),
          ),
        ),
      db
        .select({ workDate: attendanceRecords.workDate, status: attendanceRecords.status })
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.employeeUserId, employee.userId),
            gte(attendanceRecords.workDate, period.periodStart),
            lte(attendanceRecords.workDate, period.periodEnd),
          ),
        ),
      db
        .select({
          startDate: leaveRequests.startDate,
          endDate: leaveRequests.endDate,
          dayPortion: leaveRequests.dayPortion,
          isPaid: leaveTypes.isPaid,
        })
        .from(leaveRequests)
        .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
        .where(
          and(
            eq(leaveRequests.employeeUserId, employee.userId),
            eq(leaveRequests.status, "approved"),
            lte(leaveRequests.startDate, period.periodEnd),
            gte(leaveRequests.endDate, period.periodStart),
            isNull(leaveRequests.deletedAt),
          ),
        ),
      db
        .select({
          code: salaryComponents.code,
          name: salaryComponents.name,
          type: salaryComponents.type,
          amountPaise: payrollAdjustments.amountPaise,
          displayOrder: salaryComponents.displayOrder,
        })
        .from(payrollAdjustments)
        .innerJoin(salaryComponents, eq(payrollAdjustments.componentId, salaryComponents.id))
        .where(
          and(
            eq(payrollAdjustments.periodId, period.id),
            eq(payrollAdjustments.employeeUserId, employee.userId),
            isNull(payrollAdjustments.deletedAt),
          ),
        ),
    ]);
    const eligibleStart =
      employee.joinDate && employee.joinDate > period.periodStart
        ? employee.joinDate
        : period.periodStart;
    const eligibleEnd =
      employee.lastWorkingDate && employee.lastWorkingDate < period.periodEnd
        ? employee.lastWorkingDate
        : period.periodEnd;
    const eligibleDates = eachDate(eligibleStart, eligibleEnd);
    const attendanceByDate = new Map(attendance.map((row) => [row.workDate, row.status]));
    const paidHalfDays = eligibleDates.reduce((sum, date) => {
      const leave = leaveRows.find((row) => row.startDate <= date && row.endDate >= date);
      return sum + paidUnits(attendanceByDate.get(date) ?? "absent", leave?.isPaid);
    }, 0);
    const result = calculatePayroll({
      components,
      adjustments,
      eligibleHalfDays: eligibleDates.length * 2,
      paidHalfDays,
    });
    const entryId = crypto.randomUUID();
    prepared.push({
      entry: {
        id: entryId,
        periodId: period.id,
        employeeUserId: employee.userId,
        employeeCode: employee.employeeCode ?? employee.userId,
        employeeName: employee.name,
        designationName: employee.designationName,
        structureName: assignment[0].structureName,
        eligibleHalfDays: eligibleDates.length * 2,
        paidHalfDays,
        grossPaise: result.grossPaise,
        deductionsPaise: result.deductionsPaise,
        reimbursementsPaise: result.reimbursementsPaise,
        netPayPaise: result.netPayPaise,
        employerContributionsPaise: result.employerContributionsPaise,
        totalCostPaise: result.totalCostPaise,
        validationStatus: result.validationStatus,
        validationMessages: result.validationMessages,
        inputSnapshot: {
          calculationVersion: period.calculationVersion,
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
          joinDate: employee.joinDate,
          lastWorkingDate: employee.lastWorkingDate,
        },
        createdBy: actor.id,
        updatedBy: actor.id,
      },
      lines: result.lines.map((line) => ({
        entryId,
        componentCode: line.code,
        componentName: line.name,
        componentType: line.type,
        amountPaise: line.amountPaise,
        displayOrder: line.displayOrder,
      })),
    });
  }
  if (!prepared.length)
    throw new Error("No payroll-eligible employees with active salary assignments were found.");
  await db.transaction(async (tx) => {
    const ids = await tx
      .select({ id: payrollEntries.id })
      .from(payrollEntries)
      .where(eq(payrollEntries.periodId, period.id));
    if (ids.length)
      await tx.delete(payrollEntryLines).where(
        inArray(
          payrollEntryLines.entryId,
          ids.map((row) => row.id),
        ),
      );
    await tx.delete(payrollEntries).where(eq(payrollEntries.periodId, period.id));
    await tx.insert(payrollEntries).values(prepared.map((item) => item.entry));
    await tx.insert(payrollEntryLines).values(prepared.flatMap((item) => item.lines));
    await tx
      .update(payrollPeriods)
      .set({
        status: "calculated",
        calculatedAt: new Date(),
        calculatedBy: actor.id,
        updatedBy: actor.id,
      })
      .where(eq(payrollPeriods.id, period.id));
  });
}

export async function approvePayrollPeriod(periodId: string, actor: HrActor) {
  await assertHrCapability(actor, "payroll_admin");
  const period = await db.query.payrollPeriods.findFirst({
    where: eq(payrollPeriods.id, periodId),
  });
  if (period?.status !== "calculated") throw new Error("Only calculated payroll can be approved.");
  const warnings = await db.query.payrollEntries.findFirst({
    where: and(
      eq(payrollEntries.periodId, period.id),
      eq(payrollEntries.validationStatus, "warning"),
    ),
  });
  if (warnings) throw new Error("Resolve payroll validation warnings before approval.");
  if (period.calculatedBy === actor.id) {
    const alternative = await db
      .select({ id: user.id })
      .from(user)
      .leftJoin(hrCapabilityAssignments, eq(user.id, hrCapabilityAssignments.userId))
      .where(
        and(
          sql`${user.id} <> ${actor.id}`,
          eq(user.banned, false),
          or(
            eq(user.role, "super_admin"),
            and(
              eq(hrCapabilityAssignments.capability, "payroll_admin"),
              isNull(hrCapabilityAssignments.deletedAt),
            ),
          ),
        ),
      )
      .limit(1);
    if (alternative.length)
      throw new Error("A different payroll administrator must approve this run.");
  }
  await lockAttendancePeriod(
    {
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      reason: `Approved payroll ${period.periodMonth.slice(0, 7)}`,
      payrollPeriodReference: period.id,
    },
    actor,
    "payroll_admin",
  );
  await db
    .update(payrollPeriods)
    .set({ status: "approved", approvedAt: new Date(), approvedBy: actor.id, updatedBy: actor.id })
    .where(and(eq(payrollPeriods.id, period.id), eq(payrollPeriods.status, "calculated")));
}

export async function listPayrollPeriods(actor: HrActor) {
  await assertHrCapability(actor, "payroll_admin");
  return db
    .select({
      id: payrollPeriods.id,
      periodMonth: payrollPeriods.periodMonth,
      status: payrollPeriods.status,
      calculatedAt: payrollPeriods.calculatedAt,
      approvedAt: payrollPeriods.approvedAt,
      postedAt: payrollPeriods.postedAt,
      paidAt: payrollPeriods.paidAt,
      employeeCount: sql<number>`count(${payrollEntries.id})::int`,
      netPayPaise: sql<number>`coalesce(sum(${payrollEntries.netPayPaise}), 0)::int`,
    })
    .from(payrollPeriods)
    .leftJoin(payrollEntries, eq(payrollPeriods.id, payrollEntries.periodId))
    .where(isNull(payrollPeriods.deletedAt))
    .groupBy(payrollPeriods.id)
    .orderBy(desc(payrollPeriods.periodMonth));
}
export async function getPayrollPeriod(periodId: string, actor: HrActor) {
  await assertHrCapability(actor, "payroll_admin");
  const period = await db.query.payrollPeriods.findFirst({
    where: and(eq(payrollPeriods.id, periodId), isNull(payrollPeriods.deletedAt)),
  });
  if (!period) return null;
  const entries = await db.query.payrollEntries.findMany({
    where: eq(payrollEntries.periodId, period.id),
    orderBy: [payrollEntries.employeeName],
    with: { lines: true, payslip: true },
  });
  return { period, entries };
}
export async function listPayrollSettings(actor: HrActor) {
  await assertHrCapability(actor, "payroll_admin");
  const [components, structures, lines, assignments, employees, openingBalances] =
    await Promise.all([
      db
        .select()
        .from(salaryComponents)
        .where(isNull(salaryComponents.deletedAt))
        .orderBy(salaryComponents.displayOrder),
      db
        .select()
        .from(salaryStructures)
        .where(isNull(salaryStructures.deletedAt))
        .orderBy(salaryStructures.name),
      db
        .select({
          id: salaryStructureLines.id,
          structureName: salaryStructures.name,
          componentName: salaryComponents.name,
          calculationMode: salaryComponents.calculationMode,
          amountPaise: salaryStructureLines.amountPaise,
          rateBasisPoints: salaryStructureLines.rateBasisPoints,
        })
        .from(salaryStructureLines)
        .innerJoin(salaryStructures, eq(salaryStructureLines.structureId, salaryStructures.id))
        .innerJoin(salaryComponents, eq(salaryStructureLines.componentId, salaryComponents.id))
        .where(isNull(salaryStructureLines.deletedAt)),
      db
        .select({
          id: employeeSalaryAssignments.id,
          employeeName: user.name,
          structureName: salaryStructures.name,
          effectiveFrom: employeeSalaryAssignments.effectiveFrom,
          effectiveTo: employeeSalaryAssignments.effectiveTo,
        })
        .from(employeeSalaryAssignments)
        .innerJoin(user, eq(employeeSalaryAssignments.employeeUserId, user.id))
        .innerJoin(salaryStructures, eq(employeeSalaryAssignments.structureId, salaryStructures.id))
        .where(isNull(employeeSalaryAssignments.deletedAt))
        .orderBy(user.name),
      db
        .select({ id: user.id, name: user.name })
        .from(user)
        .innerJoin(staffProfiles, eq(user.id, staffProfiles.userId))
        .where(eq(staffProfiles.payrollEligible, true))
        .orderBy(user.name),
      db
        .select({
          id: payrollOpeningBalances.id,
          year: payrollOpeningBalances.year,
          employeeName: user.name,
          componentName: salaryComponents.name,
          componentType: salaryComponents.type,
          amountPaise: payrollOpeningBalances.amountPaise,
        })
        .from(payrollOpeningBalances)
        .innerJoin(user, eq(payrollOpeningBalances.employeeUserId, user.id))
        .innerJoin(salaryComponents, eq(payrollOpeningBalances.componentId, salaryComponents.id))
        .where(isNull(payrollOpeningBalances.deletedAt))
        .orderBy(desc(payrollOpeningBalances.year), user.name, salaryComponents.displayOrder),
    ]);
  return { components, structures, lines, assignments, employees, openingBalances };
}
export async function listPayrollAdjustmentOptions(periodId: string, actor: HrActor) {
  await assertHrCapability(actor, "payroll_admin");
  const [employees, components] = await Promise.all([
    db
      .select({ id: user.id, name: user.name })
      .from(user)
      .innerJoin(staffProfiles, eq(user.id, staffProfiles.userId))
      .where(eq(staffProfiles.payrollEligible, true))
      .orderBy(user.name),
    db
      .select({ id: salaryComponents.id, name: salaryComponents.name })
      .from(salaryComponents)
      .where(and(isNull(salaryComponents.deletedAt), eq(salaryComponents.isActive, true)))
      .orderBy(salaryComponents.name),
  ]);
  return { periodId, employees, components };
}

export async function getOwnPayrollYtd(actor: HrActor, year: number) {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const [opening, processed] = await Promise.all([
    db
      .select({ type: salaryComponents.type, amountPaise: payrollOpeningBalances.amountPaise })
      .from(payrollOpeningBalances)
      .innerJoin(salaryComponents, eq(payrollOpeningBalances.componentId, salaryComponents.id))
      .where(
        and(
          eq(payrollOpeningBalances.employeeUserId, actor.id),
          eq(payrollOpeningBalances.year, year),
          isNull(payrollOpeningBalances.deletedAt),
        ),
      ),
    db
      .select({ type: payrollEntryLines.componentType, amountPaise: payrollEntryLines.amountPaise })
      .from(payrollEntryLines)
      .innerJoin(payrollEntries, eq(payrollEntryLines.entryId, payrollEntries.id))
      .innerJoin(payrollPeriods, eq(payrollEntries.periodId, payrollPeriods.id))
      .where(
        and(
          eq(payrollEntries.employeeUserId, actor.id),
          gte(payrollPeriods.periodMonth, start),
          lte(payrollPeriods.periodMonth, end),
          inArray(payrollPeriods.status, ["posted", "paid"]),
          isNull(payrollEntryLines.deletedAt),
        ),
      ),
  ]);
  return summarizePayrollYtd([...opening, ...processed]);
}

export async function listPayrollYtdForPeriod(periodId: string, actor: HrActor) {
  const data = await getPayrollPeriod(periodId, actor);
  if (!data) throw new Error("Payroll period not found.");
  if (!data.entries.length) return [];
  const employeeIds = data.entries.map((entry) => entry.employeeUserId);
  const year = Number(data.period.periodMonth.slice(0, 4));
  const [opening, processed] = await Promise.all([
    db
      .select({
        employeeUserId: payrollOpeningBalances.employeeUserId,
        type: salaryComponents.type,
        amountPaise: payrollOpeningBalances.amountPaise,
      })
      .from(payrollOpeningBalances)
      .innerJoin(salaryComponents, eq(payrollOpeningBalances.componentId, salaryComponents.id))
      .where(
        and(
          inArray(payrollOpeningBalances.employeeUserId, employeeIds),
          eq(payrollOpeningBalances.year, year),
          isNull(payrollOpeningBalances.deletedAt),
        ),
      ),
    db
      .select({
        employeeUserId: payrollEntries.employeeUserId,
        type: payrollEntryLines.componentType,
        amountPaise: payrollEntryLines.amountPaise,
      })
      .from(payrollEntryLines)
      .innerJoin(payrollEntries, eq(payrollEntryLines.entryId, payrollEntries.id))
      .innerJoin(payrollPeriods, eq(payrollEntries.periodId, payrollPeriods.id))
      .where(
        and(
          inArray(payrollEntries.employeeUserId, employeeIds),
          gte(payrollPeriods.periodMonth, `${year}-01-01`),
          lte(payrollPeriods.periodMonth, data.period.periodMonth),
          or(
            eq(payrollPeriods.id, data.period.id),
            inArray(payrollPeriods.status, ["posted", "paid"]),
          ),
          isNull(payrollEntryLines.deletedAt),
        ),
      ),
  ]);
  return data.entries.map((entry) => ({
    employeeUserId: entry.employeeUserId,
    employeeCode: entry.employeeCode,
    employeeName: entry.employeeName,
    year,
    ...summarizePayrollYtd(
      [...opening, ...processed].filter((line) => line.employeeUserId === entry.employeeUserId),
    ),
  }));
}
