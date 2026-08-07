import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  employeeTypeEnum,
  staffPincodeAllocations,
  staffProfiles,
  staffServiceAssignments,
} from "@/db/schema/staff";
import type { ActorScope, EmployeeType } from "@/lib/scope";
import { recordActivity } from "@/services/activity-log";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const staffEmployeeTypeInputSchema = z.object({
  employeeType: z.enum(employeeTypeEnum.enumValues),
});

export const staffPincodesInputSchema = z.object({
  pincodes: z.array(z.string().regex(/^\d{6}$/, "Enter a valid 6-digit pincode")).max(200),
});

export const staffServiceAssignmentsInputSchema = z.object({
  serviceIds: z.array(z.string().uuid()).max(200),
});

export type StaffScope = {
  employeeType: EmployeeType;
  pincodes: string[];
  serviceIds: string[];
};

const UNRESTRICTED_INTERNAL: StaffScope = {
  employeeType: "internal",
  pincodes: [],
  serviceIds: [],
};

/**
 * Loads a user's employeeType + territory + service assignments for ActorScope. Absence of a
 * staff_profiles row means unrestricted/internal behavior — see ADR 0001 (no backfill migration).
 */
export async function getStaffScope(userId: string): Promise<StaffScope> {
  const [profile, assignments] = await Promise.all([
    db.query.staffProfiles.findFirst({
      where: eq(staffProfiles.userId, userId),
      with: { pincodeAllocations: true },
    }),
    db
      .select({ serviceId: staffServiceAssignments.serviceId })
      .from(staffServiceAssignments)
      .where(eq(staffServiceAssignments.userId, userId)),
  ]);

  const serviceIds = assignments.map((row) => row.serviceId);
  if (!profile) {
    return { ...UNRESTRICTED_INTERNAL, serviceIds };
  }

  return {
    employeeType: profile.employeeType,
    pincodes: profile.pincodeAllocations.map((row) => row.pincode),
    serviceIds,
  };
}

export type StaffProfileSummary = {
  employeeType: EmployeeType;
  pincodes: string[];
  serviceIds: string[];
};

/** Every user's staff profile summary, keyed by userId — for the /settings/users admin table. */
export async function listStaffProfileSummaries(): Promise<Map<string, StaffProfileSummary>> {
  const [profiles, assignments] = await Promise.all([
    db.query.staffProfiles.findMany({ with: { pincodeAllocations: true } }),
    db.select().from(staffServiceAssignments),
  ]);

  const map = new Map<string, StaffProfileSummary>();
  for (const profile of profiles) {
    map.set(profile.userId, {
      employeeType: profile.employeeType,
      pincodes: profile.pincodeAllocations.map((row) => row.pincode),
      serviceIds: [],
    });
  }
  for (const assignment of assignments) {
    const existing = map.get(assignment.userId);
    if (existing) {
      existing.serviceIds.push(assignment.serviceId);
    } else {
      map.set(assignment.userId, {
        employeeType: "internal",
        pincodes: [],
        serviceIds: [assignment.serviceId],
      });
    }
  }
  return map;
}

async function ensureStaffProfile(tx: Transaction, userId: string, actor: ActorScope) {
  const existing = await tx.query.staffProfiles.findFirst({
    where: eq(staffProfiles.userId, userId),
  });
  if (existing) return existing;

  const [created] = await tx
    .insert(staffProfiles)
    .values({ userId, createdBy: actor.userId, updatedBy: actor.userId })
    .returning();
  if (!created) throw new Error("Failed to create staff profile");
  return created;
}

export async function updateStaffEmployeeType(
  userId: string,
  employeeType: EmployeeType,
  actor: ActorScope,
) {
  return db.transaction(async (tx) => {
    const profile = await ensureStaffProfile(tx, userId, actor);
    const [updated] = await tx
      .update(staffProfiles)
      .set({ employeeType, updatedBy: actor.userId })
      .where(eq(staffProfiles.id, profile.id))
      .returning();
    if (!updated) throw new Error("Failed to update employee type");

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "staff_profile",
        entityId: updated.id,
        action: "employee_type_changed",
        diff: { userId, employeeType },
      },
      tx,
    );

    return updated;
  });
}

export async function setStaffPincodes(userId: string, pincodes: string[], actor: ActorScope) {
  const normalized = Array.from(new Set(pincodes));

  return db.transaction(async (tx) => {
    const profile = await ensureStaffProfile(tx, userId, actor);

    await tx
      .delete(staffPincodeAllocations)
      .where(eq(staffPincodeAllocations.staffProfileId, profile.id));
    if (normalized.length > 0) {
      await tx.insert(staffPincodeAllocations).values(
        normalized.map((pincode) => ({
          staffProfileId: profile.id,
          pincode,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        })),
      );
    }

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "staff_profile",
        entityId: profile.id,
        action: "pincodes_updated",
        diff: { userId, pincodes: normalized },
      },
      tx,
    );
  });
}

export async function setStaffServiceAssignments(
  userId: string,
  serviceIds: string[],
  actor: ActorScope,
) {
  const normalized = Array.from(new Set(serviceIds));

  return db.transaction(async (tx) => {
    await tx.delete(staffServiceAssignments).where(eq(staffServiceAssignments.userId, userId));
    if (normalized.length > 0) {
      await tx.insert(staffServiceAssignments).values(
        normalized.map((serviceId) => ({
          userId,
          serviceId,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        })),
      );
    }

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "staff_profile",
        entityId: userId,
        action: "service_assignments_updated",
        diff: { userId, serviceIds: normalized },
      },
      tx,
    );
  });
}
