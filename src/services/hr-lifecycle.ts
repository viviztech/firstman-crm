import { and, desc, eq, isNull, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { session, user } from "@/db/schema/auth-schema";
import { enquiries } from "@/db/schema/enquiries";
import { hrCapabilityAssignments } from "@/db/schema/hr";
import { employeeStatusHistory } from "@/db/schema/hr-lifecycle";
import { orders, orderTasks } from "@/db/schema/orders";
import { staffProfiles } from "@/db/schema/staff";
import { recordActivity } from "@/services/activity-log";
import { assertHrCapability, type HrActor } from "@/services/hr";

export const employeeTransitionInputSchema = z.object({
  toStatus: z.enum(["active", "probation", "notice", "exited"]),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid effective date"),
  reason: z.string().trim().min(5, "Give a brief reason").max(500),
});

export type EmployeeTransitionInput = z.infer<typeof employeeTransitionInputSchema>;

export const rehireEmployeeInputSchema = z.object({
  toStatus: z.enum(["active", "probation"]),
  effectiveDate: z.iso.date(),
  reason: z.string().trim().min(5, "Give a brief reason").max(500),
  managerUserId: z.string().min(1, "Select a reporting manager or No manager"),
  payrollEligible: z.boolean(),
});

export type RehireEmployeeInput = z.infer<typeof rehireEmployeeInputSchema>;

type EmploymentStatus = "draft" | "active" | "probation" | "notice" | "exited";

const ALLOWED_TRANSITIONS: Record<EmploymentStatus, EmployeeTransitionInput["toStatus"][]> = {
  draft: ["active", "probation"],
  active: ["notice", "exited"],
  probation: ["active", "notice", "exited"],
  notice: ["active", "exited"],
  exited: [],
};

export function allowedEmploymentTransitions(status: EmploymentStatus) {
  return ALLOWED_TRANSITIONS[status];
}

export async function listEmployeeStatusHistory(userId: string, actor: HrActor) {
  await assertHrCapability(actor, "hr_admin");
  const profile = await db.query.staffProfiles.findFirst({
    where: eq(staffProfiles.userId, userId),
    columns: { id: true },
  });
  if (!profile) return [];
  return db
    .select({
      id: employeeStatusHistory.id,
      fromStatus: employeeStatusHistory.fromStatus,
      toStatus: employeeStatusHistory.toStatus,
      effectiveDate: employeeStatusHistory.effectiveDate,
      reason: employeeStatusHistory.reason,
      actorId: employeeStatusHistory.actorId,
      previousJoinDate: employeeStatusHistory.previousJoinDate,
      createdAt: employeeStatusHistory.createdAt,
    })
    .from(employeeStatusHistory)
    .where(eq(employeeStatusHistory.staffProfileId, profile.id))
    .orderBy(desc(employeeStatusHistory.createdAt));
}

/** Reopens an exited employment period without restoring old HR capabilities or sessions. */
export async function rehireEmployee(
  targetUserId: string,
  input: RehireEmployeeInput,
  actor: HrActor,
) {
  await assertHrCapability(actor, "hr_admin");
  const parsed = rehireEmployeeInputSchema.parse(input);
  if (parsed.effectiveDate > new Date().toISOString().slice(0, 10)) {
    throw new Error("Rehire date cannot be in the future.");
  }
  if (targetUserId === actor.id) throw new Error("You cannot rehire your own account.");
  if (parsed.managerUserId === targetUserId) {
    throw new Error("An employee cannot report to themselves.");
  }

  return db.transaction(async (tx) => {
    const [target] = await tx
      .select({ id: user.id, banned: user.banned, banReason: user.banReason })
      .from(user)
      .where(eq(user.id, targetUserId))
      .for("update")
      .limit(1);
    if (!target) throw new Error("Employee account not found.");
    if (!target.banned || target.banReason !== "Employment ended") {
      throw new Error("Only an account banned by the HR exit workflow can be rehired.");
    }
    const [profile] = await tx
      .select()
      .from(staffProfiles)
      .where(and(eq(staffProfiles.userId, targetUserId), isNull(staffProfiles.deletedAt)))
      .for("update")
      .limit(1);
    if (profile?.employmentStatus !== "exited") {
      throw new Error("Only an exited employee can be rehired.");
    }
    if (!profile.employeeCode || !profile.joinDate || !profile.lastWorkingDate) {
      throw new Error("Complete the prior employment record before rehire.");
    }
    if (parsed.effectiveDate <= profile.lastWorkingDate) {
      throw new Error("Rehire date must be after the previous last working date.");
    }

    const managerUserId = parsed.managerUserId === "none" ? null : parsed.managerUserId;
    if (managerUserId) {
      const [manager] = await tx
        .select({
          id: user.id,
          banned: user.banned,
          status: staffProfiles.employmentStatus,
          managerUserId: staffProfiles.managerUserId,
        })
        .from(user)
        .innerJoin(staffProfiles, eq(staffProfiles.userId, user.id))
        .where(and(eq(user.id, managerUserId), isNull(staffProfiles.deletedAt)))
        .limit(1);
      if (
        !manager ||
        manager.banned ||
        !["active", "probation", "notice"].includes(manager.status)
      ) {
        throw new Error("Reporting manager must be an active employee.");
      }
      let nextManagerId: string | null = manager.managerUserId;
      const visited = new Set([managerUserId]);
      while (nextManagerId) {
        if (nextManagerId === targetUserId || visited.has(nextManagerId)) {
          throw new Error("Reporting manager would create a cycle.");
        }
        visited.add(nextManagerId);
        const next = await tx.query.staffProfiles.findFirst({
          where: and(eq(staffProfiles.userId, nextManagerId), isNull(staffProfiles.deletedAt)),
          columns: { managerUserId: true },
        });
        nextManagerId = next?.managerUserId ?? null;
      }
    }

    const [updated] = await tx
      .update(staffProfiles)
      .set({
        employmentStatus: parsed.toStatus,
        joinDate: parsed.effectiveDate,
        confirmationDate: null,
        noticeStartDate: null,
        lastWorkingDate: null,
        managerUserId,
        payrollEligible: parsed.payrollEligible,
        updatedBy: actor.id,
      })
      .where(eq(staffProfiles.id, profile.id))
      .returning();
    if (!updated) throw new Error("Failed to rehire employee.");
    await tx
      .update(user)
      .set({ banned: false, banReason: null, banExpires: null })
      .where(eq(user.id, targetUserId));
    await tx.insert(employeeStatusHistory).values({
      staffProfileId: profile.id,
      fromStatus: "exited",
      toStatus: parsed.toStatus,
      effectiveDate: parsed.effectiveDate,
      previousJoinDate: profile.joinDate,
      reason: parsed.reason,
      actorId: actor.id,
    });
    await recordActivity(
      {
        actorId: actor.id,
        entityType: "staff_profile",
        entityId: profile.id,
        action: "employment_rehired",
        diff: {
          userId: targetUserId,
          fromStatus: "exited",
          toStatus: parsed.toStatus,
          effectiveDate: parsed.effectiveDate,
          previousJoinDate: profile.joinDate,
          managerUserId,
          payrollEligible: parsed.payrollEligible,
          reason: parsed.reason,
        },
      },
      tx,
    );
    return updated;
  });
}

export async function transitionEmployeeStatus(
  targetUserId: string,
  input: EmployeeTransitionInput,
  actor: HrActor,
) {
  await assertHrCapability(actor, "hr_admin");
  const parsed = employeeTransitionInputSchema.parse(input);
  if (parsed.effectiveDate > new Date().toISOString().slice(0, 10)) {
    throw new Error("Effective date cannot be in the future.");
  }
  if (targetUserId === actor.id && parsed.toStatus === "exited") {
    throw new Error("You cannot exit your own account.");
  }

  return db.transaction(async (tx) => {
    const [target] = await tx
      .select({ id: user.id, role: user.role, banned: user.banned })
      .from(user)
      .where(eq(user.id, targetUserId))
      .for("update")
      .limit(1);
    if (!target) throw new Error("Employee account not found.");
    if (parsed.toStatus === "exited" && target.role === "super_admin") {
      throw new Error("A super administrator cannot be exited through HR.");
    }

    const [profile] = await tx
      .select()
      .from(staffProfiles)
      .where(and(eq(staffProfiles.userId, targetUserId), isNull(staffProfiles.deletedAt)))
      .for("update")
      .limit(1);
    if (!profile) throw new Error("Complete the employee profile before changing status.");
    if (!ALLOWED_TRANSITIONS[profile.employmentStatus].includes(parsed.toStatus)) {
      throw new Error(
        `Cannot change employment from ${profile.employmentStatus} to ${parsed.toStatus}.`,
      );
    }
    if (!profile.employeeCode || !profile.joinDate) {
      throw new Error("Set an employee code and join date before changing employment status.");
    }
    if (parsed.effectiveDate < profile.joinDate) {
      throw new Error("Effective date cannot be before the join date.");
    }
    const [latestTransition] = await tx
      .select({ effectiveDate: employeeStatusHistory.effectiveDate })
      .from(employeeStatusHistory)
      .where(eq(employeeStatusHistory.staffProfileId, profile.id))
      .orderBy(desc(employeeStatusHistory.createdAt))
      .limit(1);
    if (latestTransition && parsed.effectiveDate < latestTransition.effectiveDate) {
      throw new Error("Effective date cannot be before the previous status change.");
    }
    if (parsed.toStatus === "exited") {
      const [openEnquiry, openOrder, openTask] = await Promise.all([
        tx
          .select({ id: enquiries.id })
          .from(enquiries)
          .where(
            and(
              isNull(enquiries.deletedAt),
              or(
                eq(enquiries.assignedTo, targetUserId),
                eq(enquiries.nextFollowUpAssignedTo, targetUserId),
              ),
              ne(enquiries.status, "won"),
              ne(enquiries.status, "lost"),
            ),
          )
          .limit(1),
        tx
          .select({ id: orders.id })
          .from(orders)
          .where(
            and(
              isNull(orders.deletedAt),
              eq(orders.assignedTo, targetUserId),
              ne(orders.status, "completed"),
              ne(orders.status, "cancelled"),
            ),
          )
          .limit(1),
        tx
          .select({ id: orderTasks.id })
          .from(orderTasks)
          .where(
            and(
              isNull(orderTasks.deletedAt),
              eq(orderTasks.assignedTo, targetUserId),
              ne(orderTasks.status, "done"),
            ),
          )
          .limit(1),
      ]);
      if (openEnquiry.length || openOrder.length || openTask.length) {
        throw new Error(
          "Reassign this employee's open enquiries, job cards, and tasks before exit.",
        );
      }
    }

    const [updated] = await tx
      .update(staffProfiles)
      .set({
        employmentStatus: parsed.toStatus,
        confirmationDate:
          profile.employmentStatus === "probation" && parsed.toStatus === "active"
            ? parsed.effectiveDate
            : profile.confirmationDate,
        noticeStartDate:
          parsed.toStatus === "notice" ? parsed.effectiveDate : profile.noticeStartDate,
        lastWorkingDate:
          parsed.toStatus === "exited" ? parsed.effectiveDate : profile.lastWorkingDate,
        payrollEligible: parsed.toStatus === "exited" ? false : profile.payrollEligible,
        updatedBy: actor.id,
      })
      .where(eq(staffProfiles.id, profile.id))
      .returning();
    if (!updated) throw new Error("Failed to update employment status.");

    const [history] = await tx
      .insert(employeeStatusHistory)
      .values({
        staffProfileId: profile.id,
        fromStatus: profile.employmentStatus,
        toStatus: parsed.toStatus,
        effectiveDate: parsed.effectiveDate,
        reason: parsed.reason,
        actorId: actor.id,
      })
      .returning({ id: employeeStatusHistory.id });
    if (!history) throw new Error("Failed to record employment status history.");

    if (parsed.toStatus === "exited") {
      // Same account state as better-auth admin banUser, kept in this transaction with the HR
      // transition. Both page and route-handler auth bypass cookie cache after session deletion.
      await tx
        .update(user)
        .set({ banned: true, banReason: "Employment ended", banExpires: null })
        .where(eq(user.id, targetUserId));
      await tx.delete(session).where(eq(session.userId, targetUserId));
      await tx
        .update(hrCapabilityAssignments)
        .set({ deletedAt: new Date(), updatedBy: actor.id })
        .where(
          and(
            eq(hrCapabilityAssignments.userId, targetUserId),
            isNull(hrCapabilityAssignments.deletedAt),
          ),
        );
    }

    await recordActivity(
      {
        actorId: actor.id,
        entityType: "staff_profile",
        entityId: profile.id,
        action: parsed.toStatus === "exited" ? "employment_exited" : "employment_status_changed",
        diff: {
          userId: targetUserId,
          fromStatus: profile.employmentStatus,
          toStatus: parsed.toStatus,
          effectiveDate: parsed.effectiveDate,
          reason: parsed.reason,
        },
      },
      tx,
    );
    return updated;
  });
}
