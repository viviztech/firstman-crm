import { randomBytes, randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { activityLogs } from "@/db/schema/activity-logs";
import { user } from "@/db/schema/auth-schema";
import { employeeEmergencyContacts, employeePrivateDetails } from "@/db/schema/hr-private";
import { staffProfiles } from "@/db/schema/staff";
import { updateEmployeeProfile } from "@/services/hr";
import { getEmployeePrivateDetails, saveEmployeePrivateDetails } from "@/services/hr-private";

describe("private HR records (integration)", () => {
  const adminId = randomUUID();
  const employeeId = randomUUID();
  const managerId = randomUUID();
  const admin = { id: adminId, role: "super_admin" as const };
  const employee = { id: employeeId, role: "executive" as const };
  const manager = { id: managerId, role: "manager" as const };
  const encryptionKey = randomBytes(32).toString("base64");
  let profileId: string;

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: adminId,
        name: "Private HR Admin",
        email: `private-admin-${adminId}@test.local`,
        role: "super_admin",
      },
      {
        id: employeeId,
        name: "Private HR Employee",
        email: `private-employee-${employeeId}@test.local`,
        role: "executive",
      },
      {
        id: managerId,
        name: "Private HR Manager",
        email: `private-manager-${managerId}@test.local`,
        role: "manager",
      },
    ]);
    const profile = await updateEmployeeProfile(
      employeeId,
      {
        employeeCode: `PVT-${employeeId.slice(0, 8)}`,
        employmentStatus: "active",
        payrollEligible: true,
      },
      admin,
    );
    profileId = profile.id;
  });

  beforeEach(() => vi.stubEnv("HR_DATA_ENCRYPTION_KEY", encryptionKey));
  afterEach(() => vi.unstubAllEnvs());

  afterAll(async () => {
    await db.delete(activityLogs).where(eq(activityLogs.entityId, profileId));
    await db
      .delete(employeeEmergencyContacts)
      .where(eq(employeeEmergencyContacts.staffProfileId, profileId));
    await db
      .delete(employeePrivateDetails)
      .where(eq(employeePrivateDetails.staffProfileId, profileId));
    await db.delete(staffProfiles).where(eq(staffProfiles.id, profileId));
    await db.delete(user).where(inArray(user.id, [adminId, employeeId, managerId]));
  });

  it("denies an unrelated manager before reading data", async () => {
    await expect(getEmployeePrivateDetails(employeeId, manager)).rejects.toThrow("permission");
    await expect(
      saveEmployeePrivateDetails(employeeId, { emergencyContacts: [] }, manager),
    ).rejects.toThrow("permission");
  });

  it("stores encrypted fields and lets the employee read only their own record", async () => {
    await saveEmployeePrivateDetails(
      employeeId,
      {
        dateOfBirth: "1990-04-03",
        residentialAddress: "42 Private Road",
        emergencyContacts: [
          { name: "Test Contact", relationship: "Sibling", phone: "+919999999999" },
        ],
      },
      admin,
    );
    const [stored] = await db
      .select({ ciphertext: employeePrivateDetails.ciphertext })
      .from(employeePrivateDetails)
      .where(eq(employeePrivateDetails.staffProfileId, profileId));
    expect(stored?.ciphertext).not.toContain("Private Road");
    const view = await getEmployeePrivateDetails(employeeId, employee);
    expect(view?.details?.residentialAddress).toBe("42 Private Road");
    expect(view?.emergencyContacts[0]?.name).toBe("Test Contact");
    await expect(getEmployeePrivateDetails(adminId, employee)).rejects.toThrow("permission");
  });

  it("replaces contacts without exposing old ones and audits without private values", async () => {
    await saveEmployeePrivateDetails(
      employeeId,
      {
        residentialAddress: "New Private Address",
        emergencyContacts: [
          { name: "Another Contact", relationship: "Parent", phone: "+918888888888" },
        ],
      },
      admin,
    );
    const view = await getEmployeePrivateDetails(employeeId, admin);
    expect(view?.emergencyContacts).toHaveLength(1);
    expect(view?.emergencyContacts[0]?.name).toBe("Another Contact");
    const logs = await db.query.activityLogs.findMany({
      where: and(
        eq(activityLogs.entityId, profileId),
        eq(activityLogs.action, "private_details_updated"),
      ),
    });
    expect(logs).toHaveLength(2);
    expect(JSON.stringify(logs)).not.toContain("Private Address");
    expect(JSON.stringify(logs)).not.toContain("Another Contact");
  });
});
