import { fromZonedTime } from "date-fns-tz";
import { and, desc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  attendancePeriodLocks,
  attendanceRecords,
  attendanceRegularizationHistory,
  attendanceRegularizations,
  shiftAssignments,
  shifts,
} from "@/db/schema/attendance";
import { user } from "@/db/schema/auth-schema";
import { holidayCalendars, holidays, leaveRequests } from "@/db/schema/leave";
import { staffProfiles } from "@/db/schema/staff";
import { assertHrCapability, type HrActor, hasHrCapability } from "@/services/hr";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const shiftInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(2)
      .max(20)
      .regex(/^[A-Z0-9_-]+$/),
    name: z.string().trim().min(2).max(100),
    startTime: z.string().regex(TIME, "Enter a valid start time"),
    endTime: z.string().regex(TIME, "Enter a valid end time"),
    breakMinutes: z.coerce.number().int().min(0).max(480),
    fullDayMinutes: z.coerce.number().int().min(1).max(1440),
    halfDayMinutes: z.coerce.number().int().min(1).max(1440),
    crossesMidnight: z.boolean(),
  })
  .refine((value) => value.halfDayMinutes <= value.fullDayMinutes, {
    path: ["halfDayMinutes"],
    message: "Half-day minutes cannot exceed full-day minutes",
  });

export const shiftAssignmentInputSchema = z
  .object({
    employeeUserId: z.string().min(1),
    shiftId: z.string().uuid(),
    effectiveFrom: z.string().regex(DATE),
    effectiveTo: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().regex(DATE).optional(),
    ),
  })
  .refine((value) => !value.effectiveTo || value.effectiveTo >= value.effectiveFrom, {
    path: ["effectiveTo"],
    message: "Effective-to date cannot be earlier",
  });

const attendanceEntryStatus = z.enum(["present", "absent", "half_day", "missing_punch"]);
export const attendanceEntryInputSchema = z.object({
  employeeUserId: z.string().min(1),
  workDate: z.string().regex(DATE),
  firstIn: z.string().optional(),
  lastOut: z.string().optional(),
  status: attendanceEntryStatus,
  note: z.string().trim().max(500).optional(),
});

export const regularizationInputSchema = z.object({
  workDate: z.string().regex(DATE),
  requestedFirstIn: z.string().optional(),
  requestedLastOut: z.string().optional(),
  requestedStatus: attendanceEntryStatus,
  reason: z.string().trim().min(3).max(1000),
});

export const periodLockInputSchema = z
  .object({
    periodStart: z.string().regex(DATE),
    periodEnd: z.string().regex(DATE),
    reason: z.string().trim().min(3).max(500),
    payrollPeriodReference: z.string().trim().max(100).optional(),
  })
  .refine((value) => value.periodEnd >= value.periodStart, {
    path: ["periodEnd"],
    message: "Period end cannot be earlier",
  });

export type AttendanceStatus =
  | "present"
  | "absent"
  | "half_day"
  | "leave"
  | "half_day_leave"
  | "holiday"
  | "week_off"
  | "missing_punch";

export function calculateWorkedMinutes(
  firstIn: Date | null,
  lastOut: Date | null,
  breakMinutes: number,
) {
  if (!firstIn || !lastOut || lastOut <= firstIn) return 0;
  return Math.max(0, Math.floor((lastOut.getTime() - firstIn.getTime()) / 60_000) - breakMinutes);
}

export function derivePunchStatus(params: {
  firstIn: Date | null;
  lastOut: Date | null;
  workMinutes: number;
  fullDayMinutes: number;
  halfDayMinutes: number;
  fallbackStatus: "present" | "absent" | "half_day" | "missing_punch";
}): AttendanceStatus {
  if ((params.firstIn && !params.lastOut) || (!params.firstIn && params.lastOut)) {
    return "missing_punch";
  }
  if (!params.firstIn && !params.lastOut) return params.fallbackStatus;
  if (params.workMinutes >= params.fullDayMinutes) return "present";
  if (params.workMinutes >= params.halfDayMinutes) return "half_day";
  return "absent";
}

function monthRange(month: string) {
  const normalized = /^\d{4}-\d{2}$/.test(month) ? month : new Date().toISOString().slice(0, 7);
  const [year, monthNumber] = normalized.split("-").map(Number);
  const last = new Date(Date.UTC(year ?? 0, monthNumber ?? 1, 0)).getUTCDate();
  return {
    month: normalized,
    start: `${normalized}-01`,
    end: `${normalized}-${String(last).padStart(2, "0")}`,
  };
}

function eachIsoDate(start: string, end: string) {
  const rows: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last) {
    rows.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return rows;
}

async function assertUnlocked(employeeUserId: string, workDate: string) {
  const [record, period] = await Promise.all([
    db.query.attendanceRecords.findFirst({
      where: and(
        eq(attendanceRecords.employeeUserId, employeeUserId),
        eq(attendanceRecords.workDate, workDate),
      ),
      columns: { lockedAt: true },
    }),
    db.query.attendancePeriodLocks.findFirst({
      where: and(
        isNull(attendancePeriodLocks.deletedAt),
        lte(attendancePeriodLocks.periodStart, workDate),
        gte(attendancePeriodLocks.periodEnd, workDate),
      ),
      columns: { id: true },
    }),
  ]);
  if (record?.lockedAt || period) throw new Error("Attendance is locked for payroll.");
}

async function attendanceContext(employeeUserId: string, workDate: string) {
  const profile = await db.query.staffProfiles.findFirst({
    where: and(eq(staffProfiles.userId, employeeUserId), isNull(staffProfiles.deletedAt)),
    columns: { workLocationId: true, joinDate: true, lastWorkingDate: true },
    with: { workLocation: { columns: { timezone: true } } },
  });
  if (!profile) throw new Error("Employee profile not found.");
  if (profile.joinDate && workDate < profile.joinDate)
    throw new Error("Date is before employee joining.");
  if (profile.lastWorkingDate && workDate > profile.lastWorkingDate)
    throw new Error("Date is after employee exit.");
  const date = new Date(`${workDate}T00:00:00Z`);
  const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
  const [holiday, leave, assignment] = await Promise.all([
    profile.workLocationId
      ? db
          .select({ id: holidays.id })
          .from(holidays)
          .innerJoin(holidayCalendars, eq(holidays.calendarId, holidayCalendars.id))
          .where(
            and(
              eq(holidayCalendars.workLocationId, profile.workLocationId),
              eq(holidays.holidayDate, workDate),
              isNull(holidays.deletedAt),
              isNull(holidayCalendars.deletedAt),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    db.query.leaveRequests.findFirst({
      where: and(
        eq(leaveRequests.employeeUserId, employeeUserId),
        eq(leaveRequests.status, "approved"),
        lte(leaveRequests.startDate, workDate),
        gte(leaveRequests.endDate, workDate),
        isNull(leaveRequests.deletedAt),
      ),
      columns: { dayPortion: true },
    }),
    db
      .select({
        shiftId: shifts.id,
        breakMinutes: shifts.breakMinutes,
        fullDayMinutes: shifts.fullDayMinutes,
        halfDayMinutes: shifts.halfDayMinutes,
      })
      .from(shiftAssignments)
      .innerJoin(shifts, eq(shiftAssignments.shiftId, shifts.id))
      .where(
        and(
          eq(shiftAssignments.employeeUserId, employeeUserId),
          lte(shiftAssignments.effectiveFrom, workDate),
          or(isNull(shiftAssignments.effectiveTo), gte(shiftAssignments.effectiveTo, workDate)),
          isNull(shiftAssignments.deletedAt),
        ),
      )
      .orderBy(desc(shiftAssignments.effectiveFrom))
      .limit(1),
  ]);
  const override: AttendanceStatus | null = isWeekend
    ? "week_off"
    : holiday.length
      ? "holiday"
      : leave
        ? leave.dayPortion === "full_day"
          ? "leave"
          : "half_day_leave"
        : null;
  return {
    override,
    timezone: profile.workLocation?.timezone ?? "Asia/Kolkata",
    shift: assignment[0] ?? null,
  };
}

function parseLocalDateTime(value: string | undefined, timezone: string) {
  if (!value) return null;
  const parsed = /(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    ? new Date(value)
    : fromZonedTime(value, timezone);
  if (Number.isNaN(parsed.getTime())) throw new Error("Enter a valid punch date and time.");
  return parsed;
}

export async function saveAttendanceEntry(
  input: z.infer<typeof attendanceEntryInputSchema>,
  source: "manual" | "csv" | "regularization",
  actor: HrActor,
) {
  await assertHrCapability(actor, "hr_admin");
  await assertUnlocked(input.employeeUserId, input.workDate);
  const resolved = await resolveAttendanceEntry(input);
  const [saved] = await db
    .insert(attendanceRecords)
    .values({
      ...resolved,
      source,
      createdBy: actor.id,
      updatedBy: actor.id,
    })
    .onConflictDoUpdate({
      target: [attendanceRecords.employeeUserId, attendanceRecords.workDate],
      set: { ...resolved, source, updatedBy: actor.id },
    })
    .returning();
  return saved;
}

export async function resolveAttendanceEntry(input: z.infer<typeof attendanceEntryInputSchema>) {
  const context = await attendanceContext(input.employeeUserId, input.workDate);
  const firstIn = parseLocalDateTime(input.firstIn, context.timezone);
  const lastOut = parseLocalDateTime(input.lastOut, context.timezone);
  if (firstIn && lastOut && lastOut <= firstIn) {
    throw new Error("Last-out time must be after first-in time.");
  }
  const breakMinutes = context.shift?.breakMinutes ?? 0;
  const workMinutes = calculateWorkedMinutes(firstIn, lastOut, breakMinutes);
  const status =
    context.override ??
    derivePunchStatus({
      firstIn,
      lastOut,
      workMinutes,
      fullDayMinutes: context.shift?.fullDayMinutes ?? 480,
      halfDayMinutes: context.shift?.halfDayMinutes ?? 240,
      fallbackStatus: input.status,
    });
  return {
    employeeUserId: input.employeeUserId,
    workDate: input.workDate,
    shiftId: context.shift?.shiftId ?? null,
    firstIn,
    lastOut,
    workMinutes,
    status,
    note: input.note ?? null,
  };
}

export async function createShift(input: z.infer<typeof shiftInputSchema>, actor: HrActor) {
  await assertHrCapability(actor, "hr_admin");
  const [saved] = await db
    .insert(shifts)
    .values({
      ...input,
      startTime: `${input.startTime}:00`,
      endTime: `${input.endTime}:00`,
      createdBy: actor.id,
      updatedBy: actor.id,
    })
    .returning();
  return saved;
}

export async function assignShift(
  input: z.infer<typeof shiftAssignmentInputSchema>,
  actor: HrActor,
) {
  await assertHrCapability(actor, "hr_admin");
  const overlap = await db.query.shiftAssignments.findFirst({
    where: and(
      eq(shiftAssignments.employeeUserId, input.employeeUserId),
      isNull(shiftAssignments.deletedAt),
      lte(shiftAssignments.effectiveFrom, input.effectiveTo ?? "9999-12-31"),
      or(
        isNull(shiftAssignments.effectiveTo),
        gte(shiftAssignments.effectiveTo, input.effectiveFrom),
      ),
    ),
    columns: { id: true },
  });
  if (overlap) throw new Error("Employee already has an overlapping shift assignment.");
  const [saved] = await db
    .insert(shiftAssignments)
    .values({
      ...input,
      effectiveTo: input.effectiveTo ?? null,
      createdBy: actor.id,
      updatedBy: actor.id,
    })
    .returning();
  return saved;
}

export async function materializeAttendanceMonth(employeeUserId: string, month: string) {
  const range = monthRange(month);
  const profile = await db.query.staffProfiles.findFirst({
    where: and(eq(staffProfiles.userId, employeeUserId), isNull(staffProfiles.deletedAt)),
    columns: { id: true },
  });
  if (!profile) return range;
  const today = new Date().toISOString().slice(0, 10);
  const end = range.end > today ? today : range.end;
  if (end < range.start) return range;
  const [existing, periodLocks] = await Promise.all([
    db
      .select({ workDate: attendanceRecords.workDate })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeUserId, employeeUserId),
          gte(attendanceRecords.workDate, range.start),
          lte(attendanceRecords.workDate, end),
        ),
      ),
    db.query.attendancePeriodLocks.findMany({
      where: and(
        isNull(attendancePeriodLocks.deletedAt),
        lte(attendancePeriodLocks.periodStart, end),
        gte(attendancePeriodLocks.periodEnd, range.start),
      ),
    }),
  ]);
  const existingDates = new Set(existing.map((row) => row.workDate));
  for (const workDate of eachIsoDate(range.start, end)) {
    if (existingDates.has(workDate)) continue;
    try {
      const context = await attendanceContext(employeeUserId, workDate);
      const periodLock = periodLocks.find(
        (lock) => lock.periodStart <= workDate && lock.periodEnd >= workDate,
      );
      await db
        .insert(attendanceRecords)
        .values({
          employeeUserId,
          workDate,
          shiftId: context.shift?.shiftId ?? null,
          status: context.override ?? "absent",
          source: "derived",
          lockedAt: periodLock?.lockedAt ?? null,
          lockedBy: periodLock?.lockedBy ?? null,
          lockReason: periodLock?.reason ?? null,
        })
        .onConflictDoNothing();
    } catch (error) {
      if (
        !(error instanceof Error) ||
        (!error.message.includes("joining") && !error.message.includes("exit"))
      )
        throw error;
    }
  }
  return range;
}

export async function listMyAttendance(userId: string, month: string) {
  const range = await materializeAttendanceMonth(userId, month);
  const [records, requests] = await Promise.all([
    db.query.attendanceRecords.findMany({
      where: and(
        eq(attendanceRecords.employeeUserId, userId),
        gte(attendanceRecords.workDate, range.start),
        lte(attendanceRecords.workDate, range.end),
      ),
      orderBy: [attendanceRecords.workDate],
    }),
    db.query.attendanceRegularizations.findMany({
      where: and(
        eq(attendanceRegularizations.employeeUserId, userId),
        gte(attendanceRegularizations.workDate, range.start),
        lte(attendanceRegularizations.workDate, range.end),
        isNull(attendanceRegularizations.deletedAt),
      ),
      orderBy: [desc(attendanceRegularizations.createdAt)],
    }),
  ]);
  return { ...range, records, requests };
}

export async function createRegularization(
  input: z.infer<typeof regularizationInputSchema>,
  actor: HrActor,
) {
  await assertUnlocked(actor.id, input.workDate);
  const profile = await db.query.staffProfiles.findFirst({
    where: eq(staffProfiles.userId, actor.id),
    columns: { managerUserId: true, workLocationId: true },
    with: { workLocation: { columns: { timezone: true } } },
  });
  if (!profile) throw new Error("Employee profile not found.");
  const existing = await db.query.attendanceRegularizations.findFirst({
    where: and(
      eq(attendanceRegularizations.employeeUserId, actor.id),
      eq(attendanceRegularizations.workDate, input.workDate),
      eq(attendanceRegularizations.status, "pending"),
      isNull(attendanceRegularizations.deletedAt),
    ),
  });
  if (existing) throw new Error("A regularization request is already pending for this date.");
  const timezone = profile.workLocation?.timezone ?? "Asia/Kolkata";
  return db.transaction(async (tx) => {
    const [request] = await tx
      .insert(attendanceRegularizations)
      .values({
        employeeUserId: actor.id,
        workDate: input.workDate,
        requestedFirstIn: parseLocalDateTime(input.requestedFirstIn, timezone),
        requestedLastOut: parseLocalDateTime(input.requestedLastOut, timezone),
        requestedStatus: input.requestedStatus,
        reason: input.reason,
        currentApproverUserId: profile.managerUserId,
        createdBy: actor.id,
        updatedBy: actor.id,
      })
      .returning();
    if (!request) throw new Error("Failed to create regularization request.");
    await tx.insert(attendanceRegularizationHistory).values({
      requestId: request.id,
      event: "submitted",
      actorUserId: actor.id,
    });
    return request;
  });
}

export async function decideRegularization(
  requestId: string,
  decision: "approved" | "rejected",
  note: string | undefined,
  actor: HrActor,
) {
  const canManageAll = await hasHrCapability(actor, "hr_admin");
  const request = await db.query.attendanceRegularizations.findFirst({
    where: and(
      eq(attendanceRegularizations.id, requestId),
      isNull(attendanceRegularizations.deletedAt),
    ),
  });
  if (request?.status !== "pending") throw new Error("Pending regularization request not found.");
  if (!canManageAll && request.currentApproverUserId !== actor.id)
    throw new Error("You are not authorized to decide this request.");
  const resolved =
    decision === "approved"
      ? await resolveAttendanceEntry({
          employeeUserId: request.employeeUserId,
          workDate: request.workDate,
          firstIn: request.requestedFirstIn?.toISOString(),
          lastOut: request.requestedLastOut?.toISOString(),
          status: request.requestedStatus as "present" | "absent" | "half_day" | "missing_punch",
          note: request.reason,
        })
      : null;
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(attendanceRegularizations)
      .where(eq(attendanceRegularizations.id, request.id))
      .for("update")
      .limit(1);
    if (current?.status !== "pending")
      throw new Error("Regularization request was already decided.");
    if (resolved) {
      const [periodLock, record] = await Promise.all([
        tx.query.attendancePeriodLocks.findFirst({
          where: and(
            isNull(attendancePeriodLocks.deletedAt),
            lte(attendancePeriodLocks.periodStart, request.workDate),
            gte(attendancePeriodLocks.periodEnd, request.workDate),
          ),
          columns: { id: true },
        }),
        tx.query.attendanceRecords.findFirst({
          where: and(
            eq(attendanceRecords.employeeUserId, request.employeeUserId),
            eq(attendanceRecords.workDate, request.workDate),
          ),
          columns: { lockedAt: true },
        }),
      ]);
      if (periodLock || record?.lockedAt) throw new Error("Attendance is locked for payroll.");
      await tx
        .insert(attendanceRecords)
        .values({ ...resolved, source: "regularization", createdBy: actor.id, updatedBy: actor.id })
        .onConflictDoUpdate({
          target: [attendanceRecords.employeeUserId, attendanceRecords.workDate],
          set: { ...resolved, source: "regularization", updatedBy: actor.id },
        });
    }
    const [saved] = await tx
      .update(attendanceRegularizations)
      .set({
        status: decision,
        decidedAt: new Date(),
        decidedBy: actor.id,
        decisionNote: note ?? null,
        updatedBy: actor.id,
      })
      .where(eq(attendanceRegularizations.id, request.id))
      .returning();
    await tx.insert(attendanceRegularizationHistory).values({
      requestId: request.id,
      event: decision,
      actorUserId: actor.id,
      note: note ?? null,
    });
    return saved;
  });
}

export async function lockAttendancePeriod(
  input: z.infer<typeof periodLockInputSchema>,
  actor: HrActor,
  capability: "hr_admin" | "payroll_admin" = "hr_admin",
) {
  await assertHrCapability(actor, capability);
  const overlapping = await db.query.attendancePeriodLocks.findFirst({
    where: and(
      isNull(attendancePeriodLocks.deletedAt),
      lte(attendancePeriodLocks.periodStart, input.periodEnd),
      gte(attendancePeriodLocks.periodEnd, input.periodStart),
    ),
    columns: { id: true },
  });
  if (overlapping) throw new Error("An overlapping attendance period is already locked.");
  const employees = await db
    .select({ id: staffProfiles.userId })
    .from(staffProfiles)
    .where(inArray(staffProfiles.employmentStatus, ["active", "probation", "notice"]));
  const months = new Set(
    eachIsoDate(input.periodStart, input.periodEnd).map((date) => date.slice(0, 7)),
  );
  for (const employee of employees) {
    for (const month of months) await materializeAttendanceMonth(employee.id, month);
  }
  return db.transaction(async (tx) => {
    const [lock] = await tx
      .insert(attendancePeriodLocks)
      .values({
        ...input,
        payrollPeriodReference: input.payrollPeriodReference ?? null,
        lockedBy: actor.id,
        createdBy: actor.id,
        updatedBy: actor.id,
      })
      .returning();
    await tx
      .update(attendanceRecords)
      .set({
        lockedAt: new Date(),
        lockedBy: actor.id,
        lockReason: input.reason,
        updatedBy: actor.id,
      })
      .where(
        and(
          gte(attendanceRecords.workDate, input.periodStart),
          lte(attendanceRecords.workDate, input.periodEnd),
        ),
      );
    return lock;
  });
}

export async function listAttendanceTeam(actor: HrActor, month: string) {
  const canManageAll = await hasHrCapability(actor, "hr_admin");
  if (!canManageAll && actor.role !== "manager")
    throw new Error("You are not authorized to view team attendance.");
  const range = monthRange(month);
  const employees = await db
    .select({ id: user.id, name: user.name, employeeCode: staffProfiles.employeeCode })
    .from(user)
    .innerJoin(staffProfiles, eq(staffProfiles.userId, user.id))
    .where(
      and(
        inArray(staffProfiles.employmentStatus, ["active", "probation", "notice"]),
        canManageAll ? undefined : eq(staffProfiles.managerUserId, actor.id),
      ),
    );
  for (const employee of employees) await materializeAttendanceMonth(employee.id, range.month);
  const [records, regularizations] = await Promise.all([
    db
      .select({
        employeeUserId: attendanceRecords.employeeUserId,
        workDate: attendanceRecords.workDate,
        status: attendanceRecords.status,
        workMinutes: attendanceRecords.workMinutes,
        source: attendanceRecords.source,
        lockedAt: attendanceRecords.lockedAt,
      })
      .from(attendanceRecords)
      .where(
        and(
          inArray(
            attendanceRecords.employeeUserId,
            employees.map((entry) => entry.id),
          ),
          gte(attendanceRecords.workDate, range.start),
          lte(attendanceRecords.workDate, range.end),
        ),
      ),
    db
      .select({
        id: attendanceRegularizations.id,
        employeeUserId: attendanceRegularizations.employeeUserId,
        employeeName: user.name,
        workDate: attendanceRegularizations.workDate,
        requestedStatus: attendanceRegularizations.requestedStatus,
        reason: attendanceRegularizations.reason,
      })
      .from(attendanceRegularizations)
      .innerJoin(user, eq(attendanceRegularizations.employeeUserId, user.id))
      .where(
        and(
          eq(attendanceRegularizations.status, "pending"),
          canManageAll ? undefined : eq(attendanceRegularizations.currentApproverUserId, actor.id),
          isNull(attendanceRegularizations.deletedAt),
        ),
      ),
  ]);
  const summary = employees.map((employee) => {
    const rows = records.filter((record) => record.employeeUserId === employee.id);
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
    return { ...employee, counts: Object.fromEntries(counts), records: rows };
  });
  return { ...range, employees, summary, regularizations };
}

export async function listAttendanceSettings(actor: HrActor) {
  await assertHrCapability(actor, "hr_admin");
  const [shiftRows, assignments, employees, locks] = await Promise.all([
    db.select().from(shifts).where(isNull(shifts.deletedAt)).orderBy(shifts.name),
    db
      .select({
        id: shiftAssignments.id,
        employeeName: user.name,
        shiftName: shifts.name,
        effectiveFrom: shiftAssignments.effectiveFrom,
        effectiveTo: shiftAssignments.effectiveTo,
      })
      .from(shiftAssignments)
      .innerJoin(user, eq(shiftAssignments.employeeUserId, user.id))
      .innerJoin(shifts, eq(shiftAssignments.shiftId, shifts.id))
      .where(isNull(shiftAssignments.deletedAt))
      .orderBy(user.name),
    db
      .select({ id: user.id, name: user.name, employeeCode: staffProfiles.employeeCode })
      .from(user)
      .innerJoin(staffProfiles, eq(staffProfiles.userId, user.id))
      .where(inArray(staffProfiles.employmentStatus, ["active", "probation", "notice"]))
      .orderBy(user.name),
    db
      .select()
      .from(attendancePeriodLocks)
      .where(isNull(attendancePeriodLocks.deletedAt))
      .orderBy(desc(attendancePeriodLocks.periodStart)),
  ]);
  return { shifts: shiftRows, assignments, employees, locks };
}
