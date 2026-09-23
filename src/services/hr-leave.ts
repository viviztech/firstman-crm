import { and, desc, eq, gte, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { hrCapabilityAssignments, workLocations } from "@/db/schema/hr";
import {
  holidayCalendars,
  holidays,
  leaveLedger,
  leavePolicyAssignments,
  leaveRequestHistory,
  leaveRequests,
  leaveTypes,
} from "@/db/schema/leave";
import { staffProfiles } from "@/db/schema/staff";
import { assertHrCapability, type HrActor, hasHrCapability } from "@/services/hr";
import { createNotification } from "@/services/notifications";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const dateField = z.string().regex(ISO_DATE, "Enter a valid date");
const uuidField = z.string().uuid("Invalid selection");

export const leaveTypeInputSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Code is required")
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, "Use letters, numbers, dashes, or underscores"),
  name: z.string().trim().min(2, "Name is required").max(100),
  isPaid: z.boolean(),
  unit: z.enum(["day", "half_day"]),
  allowCarryForward: z.boolean(),
  maxCarryForwardDays: z.coerce.number().min(0).max(365).optional(),
});

export const leaveRequestInputSchema = z
  .object({
    leaveTypeId: uuidField,
    startDate: dateField,
    endDate: dateField,
    dayPortion: z.enum(["full_day", "first_half", "second_half"]),
    reason: z.string().trim().min(3, "Reason is required").max(1000),
  })
  .superRefine((value, context) => {
    if (value.endDate < value.startDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date cannot be earlier",
      });
    }
    if (value.startDate.slice(0, 4) !== value.endDate.slice(0, 4)) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Submit separate requests for each calendar year",
      });
    }
    if (value.dayPortion !== "full_day" && value.startDate !== value.endDate) {
      context.addIssue({
        code: "custom",
        path: ["dayPortion"],
        message: "Half-day leave must start and end on the same date",
      });
    }
  });

export const leaveAdjustmentInputSchema = z.object({
  employeeUserId: z.string().min(1, "Employee is required"),
  leaveTypeId: uuidField,
  year: z.coerce.number().int().min(2000).max(2200),
  days: z.coerce
    .number()
    .multipleOf(0.5)
    .min(-365)
    .max(365)
    .refine((value) => value !== 0, {
      message: "Adjustment cannot be zero",
    }),
  note: z.string().trim().min(3, "Note is required").max(500),
});

export const holidayInputSchema = z.object({
  workLocationId: uuidField,
  holidayDate: dateField,
  name: z.string().trim().min(2, "Holiday name is required").max(100),
});

export const leavePolicyInputSchema = z
  .object({
    employeeUserId: z.string().min(1, "Employee is required"),
    leaveTypeId: uuidField,
    effectiveFrom: dateField,
    effectiveTo: z.preprocess((value) => (value === "" ? undefined : value), dateField.optional()),
    annualEntitlementDays: z.coerce.number().multipleOf(0.5).min(0.5).max(365),
  })
  .refine((value) => !value.effectiveTo || value.effectiveTo >= value.effectiveFrom, {
    path: ["effectiveTo"],
    message: "Effective-to date cannot be earlier",
  });

export type LeaveRequestInput = z.infer<typeof leaveRequestInputSchema>;

function utcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function calculateLeaveHalfDays(
  startDate: string,
  endDate: string,
  dayPortion: "full_day" | "first_half" | "second_half",
  holidayDates: ReadonlySet<string>,
) {
  if (dayPortion !== "full_day") {
    const date = utcDate(startDate);
    if (date.getUTCDay() === 0 || date.getUTCDay() === 6 || holidayDates.has(startDate)) return 0;
    return 1;
  }
  let halfDays = 0;
  const cursor = utcDate(startDate);
  const end = utcDate(endDate);
  while (cursor <= end) {
    const day = cursor.getUTCDay();
    const current = isoDate(cursor);
    if (day !== 0 && day !== 6 && !holidayDates.has(current)) halfDays += 2;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return halfDays;
}

export function requestsOverlap(
  left: Pick<LeaveRequestInput, "startDate" | "endDate" | "dayPortion">,
  right: Pick<LeaveRequestInput, "startDate" | "endDate" | "dayPortion">,
) {
  if (left.endDate < right.startDate || right.endDate < left.startDate) return false;
  const sameSingleDay =
    left.startDate === left.endDate &&
    right.startDate === right.endDate &&
    left.startDate === right.startDate;
  if (sameSingleDay && left.dayPortion !== "full_day" && right.dayPortion !== "full_day") {
    return left.dayPortion === right.dayPortion;
  }
  return true;
}

async function getProfile(userId: string) {
  return db.query.staffProfiles.findFirst({
    where: and(eq(staffProfiles.userId, userId), isNull(staffProfiles.deletedAt)),
    columns: {
      id: true,
      userId: true,
      managerUserId: true,
      workLocationId: true,
      employmentStatus: true,
      joinDate: true,
      lastWorkingDate: true,
    },
  });
}

async function listHrAdminUserIds() {
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .leftJoin(
      hrCapabilityAssignments,
      and(
        eq(hrCapabilityAssignments.userId, user.id),
        eq(hrCapabilityAssignments.capability, "hr_admin"),
        isNull(hrCapabilityAssignments.deletedAt),
      ),
    )
    .where(
      and(
        eq(user.banned, false),
        or(eq(user.role, "super_admin"), sql`${hrCapabilityAssignments.id} is not null`),
      ),
    );
  return [...new Set(rows.map((row) => row.id))];
}

async function holidayDatesForRange(workLocationId: string | null, start: string, end: string) {
  if (!workLocationId) return new Set<string>();
  const rows = await db
    .select({ holidayDate: holidays.holidayDate })
    .from(holidays)
    .innerJoin(holidayCalendars, eq(holidays.calendarId, holidayCalendars.id))
    .where(
      and(
        eq(holidayCalendars.workLocationId, workLocationId),
        eq(holidayCalendars.isActive, true),
        isNull(holidayCalendars.deletedAt),
        isNull(holidays.deletedAt),
        gte(holidays.holidayDate, start),
        lte(holidays.holidayDate, end),
      ),
    );
  return new Set(rows.map((row) => row.holidayDate));
}

async function assertNoOverlap(
  employeeUserId: string,
  input: LeaveRequestInput,
  excludeRequestId?: string,
) {
  const rows = await db
    .select({
      id: leaveRequests.id,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      dayPortion: leaveRequests.dayPortion,
    })
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.employeeUserId, employeeUserId),
        inArray(leaveRequests.status, ["pending", "approved"]),
        isNull(leaveRequests.deletedAt),
        lte(leaveRequests.startDate, input.endDate),
        gte(leaveRequests.endDate, input.startDate),
        excludeRequestId ? ne(leaveRequests.id, excludeRequestId) : undefined,
      ),
    );
  if (rows.some((row) => requestsOverlap(row, input))) {
    throw new Error("This request overlaps another pending or approved leave request.");
  }
}

async function balanceAndReservations(
  employeeUserId: string,
  leaveTypeId: string,
  year: number,
  excludeId?: string,
) {
  const [ledgerRow] = await db
    .select({ total: sql<number>`coalesce(sum(${leaveLedger.amountHalfDays}), 0)::int` })
    .from(leaveLedger)
    .where(
      and(
        eq(leaveLedger.employeeUserId, employeeUserId),
        eq(leaveLedger.leaveTypeId, leaveTypeId),
        eq(leaveLedger.year, year),
        isNull(leaveLedger.deletedAt),
      ),
    );
  const [reservedRow] = await db
    .select({ total: sql<number>`coalesce(sum(${leaveRequests.requestedHalfDays}), 0)::int` })
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.employeeUserId, employeeUserId),
        eq(leaveRequests.leaveTypeId, leaveTypeId),
        eq(leaveRequests.status, "pending"),
        gte(leaveRequests.startDate, `${year}-01-01`),
        lte(leaveRequests.endDate, `${year}-12-31`),
        isNull(leaveRequests.deletedAt),
        excludeId ? ne(leaveRequests.id, excludeId) : undefined,
      ),
    );
  return { balance: Number(ledgerRow?.total ?? 0), reserved: Number(reservedRow?.total ?? 0) };
}

export async function createLeaveRequest(input: LeaveRequestInput, actor: HrActor) {
  const profile = await getProfile(actor.id);
  if (!profile || !["active", "probation", "notice"].includes(profile.employmentStatus)) {
    throw new Error("An active employee profile is required to request leave.");
  }
  const type = await db.query.leaveTypes.findFirst({
    where: and(
      eq(leaveTypes.id, input.leaveTypeId),
      eq(leaveTypes.isActive, true),
      isNull(leaveTypes.deletedAt),
    ),
  });
  if (!type) throw new Error("Leave type is not available.");
  if (profile.joinDate && input.startDate < profile.joinDate) {
    throw new Error("Leave cannot start before the employee join date.");
  }
  if (profile.lastWorkingDate && input.endDate > profile.lastWorkingDate) {
    throw new Error("Leave cannot extend beyond the last working date.");
  }
  if (input.dayPortion !== "full_day" && type.unit !== "half_day") {
    throw new Error("This leave type only supports full-day requests.");
  }
  const holidayDates = await holidayDatesForRange(
    profile.workLocationId,
    input.startDate,
    input.endDate,
  );
  const requestedHalfDays = calculateLeaveHalfDays(
    input.startDate,
    input.endDate,
    input.dayPortion,
    holidayDates,
  );
  if (!requestedHalfDays) throw new Error("The selected dates contain no working days.");
  const approvalRecipients = profile.managerUserId
    ? [profile.managerUserId]
    : await listHrAdminUserIds();

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select id from ${staffProfiles} where ${staffProfiles.id} = ${profile.id} for update`,
    );
    await assertNoOverlap(actor.id, input);
    const year = Number(input.startDate.slice(0, 4));
    if (type.isPaid) {
      const { balance, reserved } = await balanceAndReservations(actor.id, type.id, year);
      if (balance - reserved < requestedHalfDays)
        throw new Error("Insufficient available leave balance.");
    }
    const [request] = await tx
      .insert(leaveRequests)
      .values({
        employeeUserId: actor.id,
        leaveTypeId: type.id,
        startDate: input.startDate,
        endDate: input.endDate,
        dayPortion: input.dayPortion,
        requestedHalfDays,
        reason: input.reason,
        currentApproverUserId: profile.managerUserId,
        createdBy: actor.id,
        updatedBy: actor.id,
      })
      .returning();
    if (!request) throw new Error("Failed to create leave request.");
    await tx.insert(leaveRequestHistory).values({
      requestId: request.id,
      event: "submitted",
      actorUserId: actor.id,
    });
    for (const recipientId of approvalRecipients) {
      await createNotification(
        {
          userId: recipientId,
          type: "leave_submitted",
          title: "Leave request submitted",
          body: `${input.startDate}${input.endDate === input.startDate ? "" : ` to ${input.endDate}`} · ${input.reason}`,
          href: "/hr/leave/team",
          entityType: "leave_request_submitted",
          entityId: request.id,
        },
        tx,
      );
    }
    return request;
  });
}

export async function decideLeaveRequest(
  requestId: string,
  decision: "approved" | "rejected",
  note: string | undefined,
  actor: HrActor,
) {
  const canManageAll = await hasHrCapability(actor, "hr_admin");
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select id from ${leaveRequests} where ${leaveRequests.id} = ${requestId} for update`,
    );
    const request = await tx.query.leaveRequests.findFirst({
      where: and(eq(leaveRequests.id, requestId), isNull(leaveRequests.deletedAt)),
    });
    if (!request) throw new Error("Leave request not found.");
    if (request.status !== "pending") throw new Error("Only pending requests can be decided.");
    if (!canManageAll && request.currentApproverUserId !== actor.id) {
      throw new Error("You are not authorized to decide this leave request.");
    }
    await tx.execute(
      sql`select id from ${staffProfiles} where ${staffProfiles.userId} = ${request.employeeUserId} for update`,
    );
    if (decision === "approved") {
      const type = await tx.query.leaveTypes.findFirst({
        where: eq(leaveTypes.id, request.leaveTypeId),
      });
      if (!type) throw new Error("Leave type not found.");
      await assertNoOverlap(request.employeeUserId, request, request.id);
      const year = Number(request.startDate.slice(0, 4));
      if (type.isPaid) {
        const { balance, reserved } = await balanceAndReservations(
          request.employeeUserId,
          request.leaveTypeId,
          year,
          request.id,
        );
        if (balance - reserved < request.requestedHalfDays) {
          throw new Error("The employee no longer has enough available balance.");
        }
      }
      if (type.isPaid) {
        await tx.insert(leaveLedger).values({
          employeeUserId: request.employeeUserId,
          leaveTypeId: request.leaveTypeId,
          year,
          amountHalfDays: -request.requestedHalfDays,
          kind: "request",
          reference: `leave-request:${request.id}:approved`,
          note: request.reason,
          createdBy: actor.id,
          updatedBy: actor.id,
        });
      }
    }
    const [saved] = await tx
      .update(leaveRequests)
      .set({
        status: decision,
        decidedAt: new Date(),
        decidedBy: actor.id,
        decisionNote: note ?? null,
        updatedBy: actor.id,
      })
      .where(eq(leaveRequests.id, request.id))
      .returning();
    await tx.insert(leaveRequestHistory).values({
      requestId: request.id,
      event: decision,
      actorUserId: actor.id,
      note: note ?? null,
    });
    await createNotification(
      {
        userId: request.employeeUserId,
        type: "leave_decided",
        title: `Leave request ${decision}`,
        body:
          note ||
          `${request.startDate}${request.endDate === request.startDate ? "" : ` to ${request.endDate}`}`,
        href: "/hr/leave",
        entityType: `leave_request_${decision}`,
        entityId: request.id,
      },
      tx,
    );
    return saved;
  });
}

export async function cancelLeaveRequest(requestId: string, actor: HrActor) {
  const hrRecipients = await listHrAdminUserIds();
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select id from ${leaveRequests} where ${leaveRequests.id} = ${requestId} for update`,
    );
    const request = await tx.query.leaveRequests.findFirst({
      where: and(eq(leaveRequests.id, requestId), isNull(leaveRequests.deletedAt)),
    });
    if (!request || request.employeeUserId !== actor.id)
      throw new Error("Leave request not found.");
    if (!inArrayValue(request.status, ["pending", "approved"])) {
      throw new Error("This leave request cannot be cancelled.");
    }
    if (request.status === "approved") {
      const type = await tx.query.leaveTypes.findFirst({
        where: eq(leaveTypes.id, request.leaveTypeId),
        columns: { isPaid: true },
      });
      if (type?.isPaid) {
        await tx.insert(leaveLedger).values({
          employeeUserId: request.employeeUserId,
          leaveTypeId: request.leaveTypeId,
          year: Number(request.startDate.slice(0, 4)),
          amountHalfDays: request.requestedHalfDays,
          kind: "reversal",
          reference: `leave-request:${request.id}:cancelled`,
          note: "Approved leave cancelled by employee",
          createdBy: actor.id,
          updatedBy: actor.id,
        });
      }
    }
    const [saved] = await tx
      .update(leaveRequests)
      .set({ status: "cancelled", updatedBy: actor.id })
      .where(eq(leaveRequests.id, request.id))
      .returning();
    await tx.insert(leaveRequestHistory).values({
      requestId: request.id,
      event: "cancelled",
      actorUserId: actor.id,
    });
    const recipients = request.currentApproverUserId
      ? [request.currentApproverUserId]
      : hrRecipients;
    for (const recipientId of recipients) {
      await createNotification(
        {
          userId: recipientId,
          type: "leave_cancelled",
          title: "Leave request cancelled",
          body: `${request.startDate}${request.endDate === request.startDate ? "" : ` to ${request.endDate}`}`,
          href: "/hr/leave/team",
          entityType: "leave_request_cancelled",
          entityId: request.id,
        },
        tx,
      );
    }
    return saved;
  });
}

function inArrayValue<T>(value: T, allowed: readonly T[]) {
  return allowed.includes(value);
}

export async function createLeaveType(input: z.infer<typeof leaveTypeInputSchema>, actor: HrActor) {
  await assertHrCapability(actor, "hr_admin");
  const [saved] = await db
    .insert(leaveTypes)
    .values({
      code: input.code,
      name: input.name,
      isPaid: input.isPaid,
      unit: input.unit,
      allowCarryForward: input.allowCarryForward,
      maxCarryForwardHalfDays: input.maxCarryForwardDays
        ? Math.round(input.maxCarryForwardDays * 2)
        : null,
      createdBy: actor.id,
      updatedBy: actor.id,
    })
    .returning();
  return saved;
}

export async function addLeaveAdjustment(
  input: z.infer<typeof leaveAdjustmentInputSchema>,
  actor: HrActor,
) {
  await assertHrCapability(actor, "hr_admin");
  const [saved] = await db
    .insert(leaveLedger)
    .values({
      employeeUserId: input.employeeUserId,
      leaveTypeId: input.leaveTypeId,
      year: input.year,
      amountHalfDays: Math.round(input.days * 2),
      kind: "adjustment",
      reference: `manual:${crypto.randomUUID()}`,
      note: input.note,
      createdBy: actor.id,
      updatedBy: actor.id,
    })
    .returning();
  return saved;
}

export async function createHoliday(input: z.infer<typeof holidayInputSchema>, actor: HrActor) {
  await assertHrCapability(actor, "hr_admin");
  return db.transaction(async (tx) => {
    let calendar = await tx.query.holidayCalendars.findFirst({
      where: eq(holidayCalendars.workLocationId, input.workLocationId),
    });
    if (!calendar) {
      const location = await tx.query.workLocations.findFirst({
        where: eq(workLocations.id, input.workLocationId),
        columns: { name: true },
      });
      if (!location) throw new Error("Work location not found.");
      [calendar] = await tx
        .insert(holidayCalendars)
        .values({
          name: `${location.name} holiday calendar`,
          workLocationId: input.workLocationId,
          createdBy: actor.id,
          updatedBy: actor.id,
        })
        .returning();
    }
    if (!calendar) throw new Error("Failed to create holiday calendar.");
    const [saved] = await tx
      .insert(holidays)
      .values({ ...input, calendarId: calendar.id, createdBy: actor.id, updatedBy: actor.id })
      .returning();
    return saved;
  });
}

export async function createLeavePolicy(
  input: z.infer<typeof leavePolicyInputSchema>,
  actor: HrActor,
) {
  await assertHrCapability(actor, "hr_admin");
  const overlap = await db.query.leavePolicyAssignments.findFirst({
    where: and(
      eq(leavePolicyAssignments.employeeUserId, input.employeeUserId),
      eq(leavePolicyAssignments.leaveTypeId, input.leaveTypeId),
      isNull(leavePolicyAssignments.deletedAt),
      lte(leavePolicyAssignments.effectiveFrom, input.effectiveTo ?? "9999-12-31"),
      or(
        isNull(leavePolicyAssignments.effectiveTo),
        gte(leavePolicyAssignments.effectiveTo, input.effectiveFrom),
      ),
    ),
    columns: { id: true },
  });
  if (overlap)
    throw new Error("This employee already has an overlapping policy for that leave type.");
  const [saved] = await db
    .insert(leavePolicyAssignments)
    .values({
      employeeUserId: input.employeeUserId,
      leaveTypeId: input.leaveTypeId,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo ?? null,
      annualEntitlementHalfDays: Math.round(input.annualEntitlementDays * 2),
      createdBy: actor.id,
      updatedBy: actor.id,
    })
    .returning();
  return saved;
}

export async function listMyLeave(userId: string, year = new Date().getFullYear()) {
  const [types, balances, reservations, requests] = await Promise.all([
    db
      .select()
      .from(leaveTypes)
      .where(and(eq(leaveTypes.isActive, true), isNull(leaveTypes.deletedAt)))
      .orderBy(leaveTypes.name),
    db
      .select({
        leaveTypeId: leaveLedger.leaveTypeId,
        halfDays: sql<number>`sum(${leaveLedger.amountHalfDays})::int`,
      })
      .from(leaveLedger)
      .where(
        and(
          eq(leaveLedger.employeeUserId, userId),
          eq(leaveLedger.year, year),
          isNull(leaveLedger.deletedAt),
        ),
      )
      .groupBy(leaveLedger.leaveTypeId),
    db
      .select({
        leaveTypeId: leaveRequests.leaveTypeId,
        halfDays: sql<number>`sum(${leaveRequests.requestedHalfDays})::int`,
      })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.employeeUserId, userId),
          eq(leaveRequests.status, "pending"),
          gte(leaveRequests.startDate, `${year}-01-01`),
          lte(leaveRequests.endDate, `${year}-12-31`),
          isNull(leaveRequests.deletedAt),
        ),
      )
      .groupBy(leaveRequests.leaveTypeId),
    db
      .select({
        id: leaveRequests.id,
        leaveTypeName: leaveTypes.name,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        dayPortion: leaveRequests.dayPortion,
        requestedHalfDays: leaveRequests.requestedHalfDays,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        decisionNote: leaveRequests.decisionNote,
        createdAt: leaveRequests.createdAt,
      })
      .from(leaveRequests)
      .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(and(eq(leaveRequests.employeeUserId, userId), isNull(leaveRequests.deletedAt)))
      .orderBy(desc(leaveRequests.createdAt)),
  ]);
  const byType = new Map(balances.map((row) => [row.leaveTypeId, Number(row.halfDays)]));
  const reservedByType = new Map(
    reservations.map((row) => [row.leaveTypeId, Number(row.halfDays)]),
  );
  return {
    types,
    balances: types.map((type) => ({
      ...type,
      halfDays: type.isPaid ? (byType.get(type.id) ?? 0) - (reservedByType.get(type.id) ?? 0) : 0,
      pendingHalfDays: reservedByType.get(type.id) ?? 0,
    })),
    requests,
  };
}

export async function listLeaveApprovalQueue(actor: HrActor) {
  const canManageAll = await hasHrCapability(actor, "hr_admin");
  return db
    .select({
      id: leaveRequests.id,
      employeeName: user.name,
      leaveTypeName: leaveTypes.name,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      requestedHalfDays: leaveRequests.requestedHalfDays,
      reason: leaveRequests.reason,
      currentApproverUserId: leaveRequests.currentApproverUserId,
    })
    .from(leaveRequests)
    .innerJoin(user, eq(leaveRequests.employeeUserId, user.id))
    .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
    .where(
      and(
        eq(leaveRequests.status, "pending"),
        isNull(leaveRequests.deletedAt),
        canManageAll ? undefined : eq(leaveRequests.currentApproverUserId, actor.id),
      ),
    )
    .orderBy(leaveRequests.startDate);
}

export async function listTeamLeaveCalendar(actor: HrActor, month: string) {
  const canManageAll = await hasHrCapability(actor, "hr_admin");
  if (!canManageAll && actor.role !== "manager") {
    throw new Error("You are not authorized to view the team leave calendar.");
  }
  const normalized = /^\d{4}-\d{2}$/.test(month) ? month : isoDate(new Date()).slice(0, 7);
  const start = `${normalized}-01`;
  const startDate = utcDate(start);
  const endDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 0));
  const end = isoDate(endDate);
  const rows = await db
    .select({
      id: leaveRequests.id,
      employeeUserId: leaveRequests.employeeUserId,
      employeeName: user.name,
      leaveTypeName: leaveTypes.name,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      dayPortion: leaveRequests.dayPortion,
      status: leaveRequests.status,
    })
    .from(leaveRequests)
    .innerJoin(user, eq(leaveRequests.employeeUserId, user.id))
    .innerJoin(staffProfiles, eq(staffProfiles.userId, leaveRequests.employeeUserId))
    .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
    .where(
      and(
        inArray(leaveRequests.status, ["pending", "approved"]),
        isNull(leaveRequests.deletedAt),
        lte(leaveRequests.startDate, end),
        gte(leaveRequests.endDate, start),
        canManageAll ? undefined : eq(staffProfiles.managerUserId, actor.id),
      ),
    )
    .orderBy(leaveRequests.startDate, user.name);
  return { month: normalized, start, end, rows };
}

export async function listLeaveSettings(actor: HrActor) {
  await assertHrCapability(actor, "hr_admin");
  const [types, employees, locations, holidayRows, policyRows] = await Promise.all([
    db.select().from(leaveTypes).where(isNull(leaveTypes.deletedAt)).orderBy(leaveTypes.name),
    db
      .select({ id: user.id, name: user.name, employeeCode: staffProfiles.employeeCode })
      .from(user)
      .innerJoin(staffProfiles, eq(staffProfiles.userId, user.id))
      .where(
        and(
          inArray(staffProfiles.employmentStatus, ["active", "probation", "notice"]),
          eq(user.banned, false),
        ),
      )
      .orderBy(user.name),
    db
      .select({ id: workLocations.id, name: workLocations.name })
      .from(workLocations)
      .where(and(eq(workLocations.isActive, true), isNull(workLocations.deletedAt)))
      .orderBy(workLocations.name),
    db
      .select({
        id: holidays.id,
        name: holidays.name,
        holidayDate: holidays.holidayDate,
        locationName: workLocations.name,
      })
      .from(holidays)
      .innerJoin(holidayCalendars, eq(holidays.calendarId, holidayCalendars.id))
      .innerJoin(workLocations, eq(holidayCalendars.workLocationId, workLocations.id))
      .where(isNull(holidays.deletedAt))
      .orderBy(desc(holidays.holidayDate)),
    db
      .select({
        id: leavePolicyAssignments.id,
        employeeName: user.name,
        leaveTypeName: leaveTypes.name,
        effectiveFrom: leavePolicyAssignments.effectiveFrom,
        effectiveTo: leavePolicyAssignments.effectiveTo,
        annualEntitlementHalfDays: leavePolicyAssignments.annualEntitlementHalfDays,
      })
      .from(leavePolicyAssignments)
      .innerJoin(user, eq(leavePolicyAssignments.employeeUserId, user.id))
      .innerJoin(leaveTypes, eq(leavePolicyAssignments.leaveTypeId, leaveTypes.id))
      .where(isNull(leavePolicyAssignments.deletedAt))
      .orderBy(user.name, leaveTypes.name),
  ]);
  return { types, employees, locations, holidays: holidayRows, policyAssignments: policyRows };
}
