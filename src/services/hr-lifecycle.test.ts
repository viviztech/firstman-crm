import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { activityLogs } from "@/db/schema/activity-logs";
import { session, user } from "@/db/schema/auth-schema";
import { enquiries } from "@/db/schema/enquiries";
import { hrCapabilityAssignments } from "@/db/schema/hr";
import { employeeStatusHistory } from "@/db/schema/hr-lifecycle";
import { staffProfiles } from "@/db/schema/staff";
import { setUserBanned } from "@/lib/user-admin";
import {
  listEmployeeDirectory,
  listEmployeesForHr,
  setHrCapability,
  updateEmployeeProfile,
} from "@/services/hr";
import {
  allowedEmploymentTransitions,
  listEmployeeStatusHistory,
  rehireEmployee,
  transitionEmployeeStatus,
} from "@/services/hr-lifecycle";

describe("employee lifecycle (integration)", () => {
  const adminId = randomUUID();
  const employeeId = randomUUID();
  const admin = { id: adminId, role: "super_admin" as const };
  let profileId: string;
  let enquiryId: string | undefined;

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: adminId,
        name: "Lifecycle Admin",
        email: `lifecycle-admin-${adminId}@test.local`,
        role: "super_admin",
      },
      {
        id: employeeId,
        name: "Lifecycle Employee",
        email: `lifecycle-employee-${employeeId}@test.local`,
        role: "executive",
      },
    ]);
    const profile = await updateEmployeeProfile(
      employeeId,
      {
        employeeCode: `LC-${employeeId.slice(0, 8)}`,
        joinDate: "2026-01-01",
        employmentStatus: "active",
        payrollEligible: true,
      },
      admin,
    );
    profileId = profile.id;
  });

  afterAll(async () => {
    if (enquiryId) await db.delete(enquiries).where(eq(enquiries.id, enquiryId));
    await db
      .delete(employeeStatusHistory)
      .where(eq(employeeStatusHistory.staffProfileId, profileId));
    await db.delete(activityLogs).where(eq(activityLogs.entityId, profileId));
    await db
      .delete(activityLogs)
      .where(
        and(
          eq(activityLogs.entityType, "hr_capability_assignment"),
          eq(activityLogs.actorId, adminId),
        ),
      );
    await db.delete(hrCapabilityAssignments).where(eq(hrCapabilityAssignments.userId, employeeId));
    await db.delete(session).where(eq(session.userId, employeeId));
    await db.delete(staffProfiles).where(eq(staffProfiles.id, profileId));
    await db.delete(user).where(inArray(user.id, [adminId, employeeId]));
  });

  it("records a notice transition with its effective date and reason", async () => {
    expect(allowedEmploymentTransitions("active")).toContain("notice");
    const updated = await transitionEmployeeStatus(
      employeeId,
      { toStatus: "notice", effectiveDate: "2026-09-01", reason: "Notice period started" },
      admin,
    );
    expect(updated.employmentStatus).toBe("notice");
    expect(updated.noticeStartDate).toBe("2026-09-01");
    const history = await listEmployeeStatusHistory(employeeId, admin);
    expect(history[0]).toMatchObject({ fromStatus: "active", toStatus: "notice" });
    await expect(
      transitionEmployeeStatus(
        employeeId,
        { toStatus: "active", effectiveDate: "2026-08-31", reason: "Backdated change" },
        admin,
      ),
    ).rejects.toThrow("previous status change");
  });

  it("refuses exit while open CRM work is assigned", async () => {
    const [enquiry] = await db
      .insert(enquiries)
      .values({
        name: "Lifecycle open enquiry",
        phone: `9${employeeId.replace(/\D/g, "").slice(0, 9).padEnd(9, "0")}`,
        source: "website",
        assignedTo: employeeId,
      })
      .returning({ id: enquiries.id });
    if (!enquiry) throw new Error("Failed to create test enquiry");
    enquiryId = enquiry.id;
    await expect(
      transitionEmployeeStatus(
        employeeId,
        { toStatus: "exited", effectiveDate: "2026-09-10", reason: "Employment ended" },
        admin,
      ),
    ).rejects.toThrow("Reassign this employee's open enquiries");
    const employee = await db.query.user.findFirst({ where: eq(user.id, employeeId) });
    expect(employee?.banned).toBe(false);
    await db.update(enquiries).set({ assignedTo: null }).where(eq(enquiries.id, enquiryId));
  });

  it("atomically bans, revokes sessions and HR access, and preserves history on exit", async () => {
    await setHrCapability(employeeId, "hr_admin", true, admin);
    await db.insert(session).values({
      id: randomUUID(),
      userId: employeeId,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    const updated = await transitionEmployeeStatus(
      employeeId,
      { toStatus: "exited", effectiveDate: "2026-09-10", reason: "Employment ended" },
      admin,
    );
    expect(updated.employmentStatus).toBe("exited");
    expect(updated.payrollEligible).toBe(false);
    expect(updated.lastWorkingDate).toBe("2026-09-10");

    const [account, sessions, capability, history] = await Promise.all([
      db.query.user.findFirst({ where: eq(user.id, employeeId) }),
      db.query.session.findMany({ where: eq(session.userId, employeeId) }),
      db.query.hrCapabilityAssignments.findFirst({
        where: eq(hrCapabilityAssignments.userId, employeeId),
      }),
      listEmployeeStatusHistory(employeeId, admin),
    ]);
    expect(account?.banned).toBe(true);
    expect(sessions).toHaveLength(0);
    expect(capability?.deletedAt).not.toBeNull();
    expect(history[0]).toMatchObject({ fromStatus: "notice", toStatus: "exited" });
    expect((await listEmployeesForHr(admin)).some((row) => row.userId === employeeId)).toBe(true);
    expect((await listEmployeeDirectory()).some((row) => row.userId === employeeId)).toBe(false);
    await expect(
      transitionEmployeeStatus(
        employeeId,
        { toStatus: "active", effectiveDate: "2026-09-10", reason: "Try to reactivate" },
        admin,
      ),
    ).rejects.toThrow("Cannot change employment from exited");
  });

  it("blocks profile edits and direct unban while exited", async () => {
    await expect(
      updateEmployeeProfile(
        employeeId,
        {
          employeeCode: `LC-${employeeId.slice(0, 8)}`,
          joinDate: "2026-09-11",
          employmentStatus: "exited",
          lastWorkingDate: "2026-09-10",
          payrollEligible: false,
        },
        admin,
      ),
    ).rejects.toThrow("rehire workflow");
    await expect(setUserBanned(employeeId, false, adminId)).rejects.toThrow("rehire workflow");
  });

  it("validates rehire date and leaves manually banned accounts closed", async () => {
    const input = {
      toStatus: "probation" as const,
      effectiveDate: "2026-09-11",
      reason: "New employment period",
      managerUserId: "none",
      payrollEligible: false,
    };
    await expect(
      rehireEmployee(employeeId, { ...input, effectiveDate: "2026-09-10" }, admin),
    ).rejects.toThrow("after the previous last working date");
    await expect(
      rehireEmployee(employeeId, { ...input, managerUserId: randomUUID() }, admin),
    ).rejects.toThrow("Reporting manager must be an active employee");
    await expect(
      rehireEmployee(employeeId, input, { id: employeeId, role: "executive" }),
    ).rejects.toThrow("permission");
    await db.update(user).set({ banReason: "Manual security ban" }).where(eq(user.id, employeeId));
    await expect(rehireEmployee(employeeId, input, admin)).rejects.toThrow(
      "Only an account banned",
    );
    await db.update(user).set({ banReason: "Employment ended" }).where(eq(user.id, employeeId));
  });

  it("rehire restores access, resets dates, and keeps the old join and exit history", async () => {
    const updated = await rehireEmployee(
      employeeId,
      {
        toStatus: "probation",
        effectiveDate: "2026-09-11",
        reason: "New employment period",
        managerUserId: "none",
        payrollEligible: true,
      },
      admin,
    );
    expect(updated).toMatchObject({
      employmentStatus: "probation",
      joinDate: "2026-09-11",
      lastWorkingDate: null,
      noticeStartDate: null,
      confirmationDate: null,
      managerUserId: null,
      payrollEligible: true,
    });
    const account = await db.query.user.findFirst({ where: eq(user.id, employeeId) });
    expect(account).toMatchObject({ banned: false, banReason: null });
    const history = await listEmployeeStatusHistory(employeeId, admin);
    expect(history[0]).toMatchObject({
      fromStatus: "exited",
      toStatus: "probation",
      previousJoinDate: "2026-01-01",
    });
    expect(history.some((entry) => entry.toStatus === "exited")).toBe(true);
    expect((await listEmployeeDirectory()).some((row) => row.userId === employeeId)).toBe(true);
    const capability = await db.query.hrCapabilityAssignments.findFirst({
      where: eq(hrCapabilityAssignments.userId, employeeId),
    });
    expect(capability?.deletedAt).not.toBeNull();
    await expect(
      rehireEmployee(
        employeeId,
        {
          toStatus: "active",
          effectiveDate: "2026-09-12",
          reason: "Duplicate rehire",
          managerUserId: "none",
          payrollEligible: true,
        },
        admin,
      ),
    ).rejects.toThrow();
  });
});
