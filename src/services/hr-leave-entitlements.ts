import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  leaveCarryForwardStates,
  leaveEntitlementStates,
  leaveLedger,
  leavePolicyAssignments,
  leaveTypes,
} from "@/db/schema/leave";
import { staffProfiles } from "@/db/schema/staff";

function dateUtc(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
}

function daysInclusive(start: string, end: string) {
  return Math.floor((dateUtc(end).getTime() - dateUtc(start).getTime()) / 86_400_000) + 1;
}

export function calculateProratedEntitlementHalfDays(params: {
  year: number;
  annualEntitlementHalfDays: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  joinDate: string | null;
  lastWorkingDate: string | null;
}) {
  const yearStart = `${params.year}-01-01`;
  const yearEnd = `${params.year}-12-31`;
  const starts = [yearStart, params.effectiveFrom, params.joinDate].filter(
    (value): value is string => Boolean(value),
  );
  const ends = [yearEnd, params.effectiveTo, params.lastWorkingDate].filter(
    (value): value is string => Boolean(value),
  );
  const activeStart = starts.reduce((latest, value) => (value > latest ? value : latest));
  const activeEnd = ends.reduce((earliest, value) => (value < earliest ? value : earliest));
  if (activeEnd < activeStart) return 0;
  return Math.round(
    (params.annualEntitlementHalfDays * daysInclusive(activeStart, activeEnd)) /
      daysInclusive(yearStart, yearEnd),
  );
}

type ProvisioningResult = {
  year: number;
  entitlementAdjustments: number;
  carryForwardAdjustments: number;
  entitlementHalfDaysPosted: number;
  carryForwardHalfDaysPosted: number;
};

export async function runLeaveEntitlementProvisioning(
  year = new Date().getFullYear(),
  actorId?: string,
): Promise<ProvisioningResult> {
  const assignments = await db
    .select({
      id: leavePolicyAssignments.id,
      employeeUserId: leavePolicyAssignments.employeeUserId,
      leaveTypeId: leavePolicyAssignments.leaveTypeId,
      effectiveFrom: leavePolicyAssignments.effectiveFrom,
      effectiveTo: leavePolicyAssignments.effectiveTo,
      annualEntitlementHalfDays: leavePolicyAssignments.annualEntitlementHalfDays,
      joinDate: staffProfiles.joinDate,
      lastWorkingDate: staffProfiles.lastWorkingDate,
      allowCarryForward: leaveTypes.allowCarryForward,
      maxCarryForwardHalfDays: leaveTypes.maxCarryForwardHalfDays,
    })
    .from(leavePolicyAssignments)
    .innerJoin(staffProfiles, eq(leavePolicyAssignments.employeeUserId, staffProfiles.userId))
    .innerJoin(leaveTypes, eq(leavePolicyAssignments.leaveTypeId, leaveTypes.id))
    .where(
      and(
        isNull(leavePolicyAssignments.deletedAt),
        isNull(staffProfiles.deletedAt),
        isNull(leaveTypes.deletedAt),
        lte(leavePolicyAssignments.effectiveFrom, `${year}-12-31`),
        or(
          isNull(leavePolicyAssignments.effectiveTo),
          gte(leavePolicyAssignments.effectiveTo, `${year}-01-01`),
        ),
      ),
    );

  const result: ProvisioningResult = {
    year,
    entitlementAdjustments: 0,
    carryForwardAdjustments: 0,
    entitlementHalfDaysPosted: 0,
    carryForwardHalfDaysPosted: 0,
  };

  for (const assignment of assignments) {
    const target = calculateProratedEntitlementHalfDays({ year, ...assignment });
    const delta = await reconcileEntitlement(
      assignment.id,
      assignment.employeeUserId,
      assignment.leaveTypeId,
      year,
      target,
      actorId,
    );
    if (delta !== 0) {
      result.entitlementAdjustments += 1;
      result.entitlementHalfDaysPosted += delta;
    }
  }

  const carryPairs = new Map<
    string,
    { employeeUserId: string; leaveTypeId: string; maxCarryForwardHalfDays: number | null }
  >();
  for (const assignment of assignments) {
    const eligibleAtYearStart =
      assignment.allowCarryForward &&
      assignment.effectiveFrom <= `${year}-01-01` &&
      (!assignment.effectiveTo || assignment.effectiveTo >= `${year}-01-01`) &&
      (!assignment.joinDate || assignment.joinDate < `${year}-01-01`) &&
      (!assignment.lastWorkingDate || assignment.lastWorkingDate >= `${year}-01-01`);
    if (eligibleAtYearStart) {
      carryPairs.set(`${assignment.employeeUserId}:${assignment.leaveTypeId}`, {
        employeeUserId: assignment.employeeUserId,
        leaveTypeId: assignment.leaveTypeId,
        maxCarryForwardHalfDays: assignment.maxCarryForwardHalfDays,
      });
    }
  }

  for (const pair of carryPairs.values()) {
    const [previous] = await db
      .select({ total: sql<number>`coalesce(sum(${leaveLedger.amountHalfDays}), 0)::int` })
      .from(leaveLedger)
      .where(
        and(
          eq(leaveLedger.employeeUserId, pair.employeeUserId),
          eq(leaveLedger.leaveTypeId, pair.leaveTypeId),
          eq(leaveLedger.year, year - 1),
          isNull(leaveLedger.deletedAt),
        ),
      );
    const positiveBalance = Math.max(0, Number(previous?.total ?? 0));
    const target = Math.min(positiveBalance, pair.maxCarryForwardHalfDays ?? positiveBalance);
    const delta = await reconcileCarryForward(
      pair.employeeUserId,
      pair.leaveTypeId,
      year,
      target,
      actorId,
    );
    if (delta !== 0) {
      result.carryForwardAdjustments += 1;
      result.carryForwardHalfDaysPosted += delta;
    }
  }

  return result;
}

async function reconcileEntitlement(
  policyAssignmentId: string,
  employeeUserId: string,
  leaveTypeId: string,
  year: number,
  targetHalfDays: number,
  actorId?: string,
) {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select id from ${leavePolicyAssignments} where ${leavePolicyAssignments.id} = ${policyAssignmentId} for update`,
    );
    await tx
      .insert(leaveEntitlementStates)
      .values({ policyAssignmentId, year })
      .onConflictDoNothing();
    const state = await tx.query.leaveEntitlementStates.findFirst({
      where: and(
        eq(leaveEntitlementStates.policyAssignmentId, policyAssignmentId),
        eq(leaveEntitlementStates.year, year),
      ),
    });
    if (!state) throw new Error("Failed to initialize leave entitlement state.");
    const delta = targetHalfDays - state.grantedHalfDays;
    if (delta === 0) return 0;
    const revision = state.revision + 1;
    await tx.insert(leaveLedger).values({
      employeeUserId,
      leaveTypeId,
      year,
      amountHalfDays: delta,
      kind: "entitlement",
      reference: `entitlement:${policyAssignmentId}:${year}:r${revision}`,
      note: `Prorated annual entitlement target: ${targetHalfDays / 2} days`,
      createdBy: actorId ?? null,
      updatedBy: actorId ?? null,
    });
    await tx
      .update(leaveEntitlementStates)
      .set({ grantedHalfDays: targetHalfDays, revision })
      .where(eq(leaveEntitlementStates.id, state.id));
    return delta;
  });
}

async function reconcileCarryForward(
  employeeUserId: string,
  leaveTypeId: string,
  year: number,
  targetHalfDays: number,
  actorId?: string,
) {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select id from ${staffProfiles} where ${staffProfiles.userId} = ${employeeUserId} for update`,
    );
    await tx
      .insert(leaveCarryForwardStates)
      .values({ employeeUserId, leaveTypeId, year })
      .onConflictDoNothing();
    const state = await tx.query.leaveCarryForwardStates.findFirst({
      where: and(
        eq(leaveCarryForwardStates.employeeUserId, employeeUserId),
        eq(leaveCarryForwardStates.leaveTypeId, leaveTypeId),
        eq(leaveCarryForwardStates.year, year),
      ),
    });
    if (!state) throw new Error("Failed to initialize carry-forward state.");
    const delta = targetHalfDays - state.grantedHalfDays;
    if (delta === 0) return 0;
    const revision = state.revision + 1;
    await tx.insert(leaveLedger).values({
      employeeUserId,
      leaveTypeId,
      year,
      amountHalfDays: delta,
      kind: "entitlement",
      reference: `carry-forward:${employeeUserId}:${leaveTypeId}:${year}:r${revision}`,
      note: `Carry-forward target: ${targetHalfDays / 2} days`,
      createdBy: actorId ?? null,
      updatedBy: actorId ?? null,
    });
    await tx
      .update(leaveCarryForwardStates)
      .set({ grantedHalfDays: targetHalfDays, revision })
      .where(eq(leaveCarryForwardStates.id, state.id));
    return delta;
  });
}
