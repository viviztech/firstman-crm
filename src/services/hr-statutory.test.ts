import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { activityLogs } from "@/db/schema/activity-logs";
import { user } from "@/db/schema/auth-schema";
import { employeeStatutoryDetails } from "@/db/schema/hr-private";
import { staffProfiles } from "@/db/schema/staff";
import { updateEmployeeProfile } from "@/services/hr";
import {
  getEmployeeStatutoryDetails,
  getOwnEmployeeStatutoryDetails,
  saveEmployeeStatutoryDetails,
} from "@/services/hr-statutory";

describe("employee statutory details (integration)", () => {
  const adminId = randomUUID();
  const employeeId = randomUUID();
  const unrelatedId = randomUUID();
  const admin = { id: adminId, role: "super_admin" as const };
  const employee = { id: employeeId, role: "executive" as const };
  const unrelated = { id: unrelatedId, role: "manager" as const };
  let profileId: string;

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: adminId,
        name: "Statutory Admin",
        email: `stat-admin-${adminId}@test.local`,
        role: "super_admin",
      },
      {
        id: employeeId,
        name: "Statutory Employee",
        email: `stat-employee-${employeeId}@test.local`,
        role: "executive",
      },
      {
        id: unrelatedId,
        name: "Statutory Stranger",
        email: `stat-stranger-${unrelatedId}@test.local`,
        role: "manager",
      },
    ]);
    profileId = (
      await updateEmployeeProfile(
        employeeId,
        {
          employeeCode: `STAT-${employeeId.slice(0, 8)}`,
          employmentStatus: "active",
          payrollEligible: true,
        },
        admin,
      )
    ).id;
  });

  afterAll(async () => {
    await db.delete(activityLogs).where(eq(activityLogs.entityId, profileId));
    await db
      .delete(employeeStatutoryDetails)
      .where(eq(employeeStatutoryDetails.staffProfileId, profileId));
    await db.delete(staffProfiles).where(eq(staffProfiles.id, profileId));
    await db.delete(user).where(inArray(user.id, [adminId, employeeId, unrelatedId]));
  });

  it("denies unrelated reads and employee writes", async () => {
    await expect(getEmployeeStatutoryDetails(employeeId, unrelated)).rejects.toThrow("permission");
    await expect(
      saveEmployeeStatutoryDetails(
        employeeId,
        {
          pan: "ABCDE1234F",
          uan: "123456789012",
          esiNumber: "1234567890",
          aadhaarLastFour: "1234",
          pfEligible: true,
          esiEligible: true,
          professionalTaxEligible: true,
        },
        employee,
      ),
    ).rejects.toThrow("permission");
  });

  it("encrypts identifiers, masks payroll reads, and gives the employee their full values", async () => {
    await saveEmployeeStatutoryDetails(
      employeeId,
      {
        pan: "ABCDE1234F",
        uan: "123456789012",
        esiNumber: "1234567890",
        aadhaarLastFour: "1234",
        pfEligible: true,
        esiEligible: false,
        professionalTaxEligible: true,
      },
      admin,
    );
    const row = await db.query.employeeStatutoryDetails.findFirst({
      where: eq(employeeStatutoryDetails.staffProfileId, profileId),
    });
    expect(row?.ciphertext).toMatch(/^v2:/);
    expect(row?.ciphertext).not.toContain("ABCDE1234F");
    expect(await getEmployeeStatutoryDetails(employeeId, admin)).toMatchObject({
      pan: "••••••234F",
      uan: "••••••••9012",
      esiNumber: "••••••7890",
      aadhaarLastFour: "1234",
    });
    expect(await getOwnEmployeeStatutoryDetails(employee)).toMatchObject({
      pan: "ABCDE1234F",
      uan: "123456789012",
    });
  });

  it("retains identifiers on blank edits and keeps them out of audit logs", async () => {
    await saveEmployeeStatutoryDetails(
      employeeId,
      {
        pan: "",
        uan: "",
        esiNumber: "",
        aadhaarLastFour: "",
        pfEligible: false,
        esiEligible: true,
        professionalTaxEligible: false,
      },
      admin,
    );
    expect(await getOwnEmployeeStatutoryDetails(employee)).toMatchObject({
      pan: "ABCDE1234F",
      uan: "123456789012",
      pfEligible: false,
      esiEligible: true,
    });
    const logs = await db.query.activityLogs.findMany({
      where: eq(activityLogs.entityId, profileId),
    });
    expect(JSON.stringify(logs)).not.toContain("ABCDE1234F");
    expect(JSON.stringify(logs)).not.toContain("123456789012");
  });
});
