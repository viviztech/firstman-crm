import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { activityLogs } from "@/db/schema/activity-logs";
import { user } from "@/db/schema/auth-schema";
import { employeeStatutoryDetails } from "@/db/schema/hr-private";
import { staffProfiles } from "@/db/schema/staff";
import { updateEmployeeProfile } from "@/services/hr";
import { rotateHrEncryption } from "@/services/hr-key-rotation";
import {
  getOwnEmployeeStatutoryDetails,
  saveEmployeeStatutoryDetails,
} from "@/services/hr-statutory";

describe("HR encryption rotation (integration)", () => {
  const adminId = randomUUID();
  const employeeId = randomUUID();
  const admin = { id: adminId, role: "super_admin" as const };
  const employee = { id: employeeId, role: "executive" as const };
  let profileId: string;

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: adminId,
        name: "Rotation Admin",
        email: `rotation-admin-${adminId}@test.local`,
        role: "super_admin",
      },
      {
        id: employeeId,
        name: "Rotation Employee",
        email: `rotation-employee-${employeeId}@test.local`,
        role: "executive",
      },
    ]);
    profileId = (
      await updateEmployeeProfile(
        employeeId,
        {
          employeeCode: `ROT-${employeeId.slice(0, 8)}`,
          employmentStatus: "active",
          payrollEligible: true,
        },
        admin,
      )
    ).id;
    await saveEmployeeStatutoryDetails(
      employeeId,
      {
        pan: "ABCDE1234F",
        uan: "",
        esiNumber: "",
        aadhaarLastFour: "",
        pfEligible: true,
        esiEligible: false,
        professionalTaxEligible: false,
      },
      admin,
    );
  });

  afterAll(async () => {
    await db.delete(activityLogs).where(inArray(activityLogs.entityId, [profileId, adminId]));
    await db
      .delete(employeeStatutoryDetails)
      .where(eq(employeeStatutoryDetails.staffProfileId, profileId));
    await db.delete(staffProfiles).where(eq(staffProfiles.id, profileId));
    await db.delete(user).where(inArray(user.id, [adminId, employeeId]));
  });

  it("requires super-admin and atomically re-encrypts readable records", async () => {
    await expect(rotateHrEncryption({ id: employeeId, role: "executive" })).rejects.toThrow(
      "super administrator",
    );
    const before = await db.query.employeeStatutoryDetails.findFirst({
      where: eq(employeeStatutoryDetails.staffProfileId, profileId),
    });
    const result = await rotateHrEncryption(admin);
    const after = await db.query.employeeStatutoryDetails.findFirst({
      where: eq(employeeStatutoryDetails.staffProfileId, profileId),
    });
    expect(result.statutoryDetails).toBeGreaterThanOrEqual(1);
    expect(after?.ciphertext).not.toBe(before?.ciphertext);
    expect(after?.keyVersion).toBe(2);
    expect((await getOwnEmployeeStatutoryDetails(employee))?.pan).toBe("ABCDE1234F");
  });
});
