import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { activityLogs } from "@/db/schema/activity-logs";
import { user } from "@/db/schema/auth-schema";
import { hrCapabilityAssignments } from "@/db/schema/hr";
import { staffProfiles } from "@/db/schema/staff";
import {
  getEmployeeSelfProfile,
  getHrCapabilities,
  hasHrCapability,
  setHrCapability,
  updateEmployeeProfile,
} from "@/services/hr";

describe("HR service authorization and employee core (integration)", () => {
  const adminId = randomUUID();
  const managerId = randomUUID();
  const employeeId = randomUUID();
  const admin = { id: adminId, role: "super_admin" as const };
  const manager = { id: managerId, role: "manager" as const };

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: adminId,
        name: "HR Test Admin",
        email: `hr-admin-${adminId}@test.local`,
        emailVerified: true,
        role: "super_admin",
      },
      {
        id: managerId,
        name: "HR Test Manager",
        email: `hr-manager-${managerId}@test.local`,
        emailVerified: true,
        role: "manager",
      },
      {
        id: employeeId,
        name: "HR Test Employee",
        email: `hr-employee-${employeeId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
    ]);
  });

  afterAll(async () => {
    const profile = await db.query.staffProfiles.findFirst({
      where: eq(staffProfiles.userId, employeeId),
      columns: { id: true },
    });
    if (profile) {
      await db.delete(activityLogs).where(eq(activityLogs.entityId, profile.id));
    }
    await db
      .delete(activityLogs)
      .where(
        and(
          inArray(activityLogs.entityType, ["hr_capability_assignment"]),
          eq(activityLogs.actorId, adminId),
        ),
      );
    await db
      .delete(hrCapabilityAssignments)
      .where(inArray(hrCapabilityAssignments.userId, [managerId, employeeId]));
    await db.delete(staffProfiles).where(eq(staffProfiles.userId, employeeId));
    await db.delete(user).where(inArray(user.id, [adminId, managerId, employeeId]));
  });

  it("grants both HR capabilities implicitly to super administrators", async () => {
    await expect(getHrCapabilities(admin)).resolves.toEqual(["hr_admin", "payroll_admin"]);
  });

  it("fails closed for a manager until a super administrator grants HR access", async () => {
    await expect(hasHrCapability(manager, "hr_admin")).resolves.toBe(false);
    await setHrCapability(managerId, "hr_admin", true, admin);
    await expect(hasHrCapability(manager, "hr_admin")).resolves.toBe(true);
  });

  it("does not let a delegated HR administrator grant capabilities", async () => {
    await expect(setHrCapability(employeeId, "hr_admin", true, manager)).rejects.toThrow(
      "Only a super administrator",
    );
  });

  it("creates an employee profile through an authorized, audited service mutation", async () => {
    const saved = await updateEmployeeProfile(
      employeeId,
      {
        employeeCode: `EMP-${employeeId.slice(0, 8)}`,
        legalName: "HR Test Employee Legal Name",
        phone: "+919999999999",
        personalEmail: "employee.personal@test.local",
        employmentStatus: "active",
        employmentCategory: "permanent",
        joinDate: "2026-01-05",
        payrollEligible: true,
      },
      manager,
    );

    expect(saved.employmentStatus).toBe("active");
    expect(saved.payrollEligible).toBe(true);
    const log = await db.query.activityLogs.findFirst({
      where: and(
        eq(activityLogs.entityId, saved.id),
        eq(activityLogs.action, "hr_profile_created"),
      ),
    });
    expect(log).toBeDefined();
  });

  it("returns the employee-safe self projection", async () => {
    const profile = await getEmployeeSelfProfile(employeeId);
    expect(profile).toMatchObject({
      employeeCode: `EMP-${employeeId.slice(0, 8)}`,
      employmentStatus: "active",
    });
    expect(profile).not.toHaveProperty("payrollEligible");
  });

  it("rejects self-reporting manager relationships", async () => {
    await expect(
      updateEmployeeProfile(
        employeeId,
        {
          employeeCode: `EMP-${employeeId.slice(0, 8)}`,
          managerUserId: employeeId,
          employmentStatus: "active",
          payrollEligible: true,
        },
        manager,
      ),
    ).rejects.toThrow("cannot report to themselves");
  });

  it("cannot mark an employee exited before session revocation is implemented", async () => {
    await expect(
      updateEmployeeProfile(
        employeeId,
        {
          employeeCode: `EMP-${employeeId.slice(0, 8)}`,
          employmentStatus: "exited",
          lastWorkingDate: "2026-09-30",
          payrollEligible: false,
        },
        manager,
      ),
    ).rejects.toThrow("employment lifecycle workflow");
  });
});
