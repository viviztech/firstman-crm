import { randomBytes, randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { activityLogs } from "@/db/schema/activity-logs";
import { user } from "@/db/schema/auth-schema";
import { employeeBankAccounts } from "@/db/schema/hr-private";
import { staffProfiles } from "@/db/schema/staff";
import { updateEmployeeProfile } from "@/services/hr";
import {
  getEmployeeBankAccount,
  getOwnEmployeeBankAccount,
  saveEmployeeBankAccount,
} from "@/services/hr-bank";

describe("employee bank details (integration)", () => {
  const adminId = randomUUID();
  const employeeId = randomUUID();
  const hrId = randomUUID();
  const admin = { id: adminId, role: "super_admin" as const };
  const employee = { id: employeeId, role: "executive" as const };
  const unrelated = { id: hrId, role: "manager" as const };
  const encryptionKey = randomBytes(32).toString("base64");
  let profileId: string;

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: adminId,
        name: "Bank Admin",
        email: `bank-admin-${adminId}@test.local`,
        role: "super_admin",
      },
      {
        id: employeeId,
        name: "Bank Employee",
        email: `bank-employee-${employeeId}@test.local`,
        role: "executive",
      },
      {
        id: hrId,
        name: "Bank Unrelated",
        email: `bank-unrelated-${hrId}@test.local`,
        role: "manager",
      },
    ]);
    profileId = (
      await updateEmployeeProfile(
        employeeId,
        {
          employeeCode: `BANK-${employeeId.slice(0, 8)}`,
          employmentStatus: "active",
          payrollEligible: true,
        },
        admin,
      )
    ).id;
  });
  beforeEach(() => vi.stubEnv("HR_DATA_ENCRYPTION_KEY", encryptionKey));
  afterEach(() => vi.unstubAllEnvs());
  afterAll(async () => {
    await db.delete(activityLogs).where(eq(activityLogs.entityId, profileId));
    await db.delete(employeeBankAccounts).where(eq(employeeBankAccounts.staffProfileId, profileId));
    await db.delete(staffProfiles).where(eq(staffProfiles.id, profileId));
    await db.delete(user).where(inArray(user.id, [adminId, employeeId, hrId]));
  });

  it("denies unrelated and employee writes", async () => {
    await expect(getEmployeeBankAccount(employeeId, unrelated)).rejects.toThrow("permission");
    await expect(
      saveEmployeeBankAccount(
        employeeId,
        {
          accountHolderName: "Test Employee",
          accountNumber: "123456789012",
          ifsc: "HDFC0001234",
        },
        employee,
      ),
    ).rejects.toThrow("permission");
  });

  it("encrypts the whole account, masks reads, and preserves number on blank edit", async () => {
    await saveEmployeeBankAccount(
      employeeId,
      {
        accountHolderName: "Test Employee",
        accountNumber: "123456789012",
        ifsc: "HDFC0001234",
      },
      admin,
    );
    const row = await db.query.employeeBankAccounts.findFirst({
      where: eq(employeeBankAccounts.staffProfileId, profileId),
    });
    expect(row?.ciphertext).not.toContain("123456789012");
    expect(row?.ciphertext).not.toContain("HDFC0001234");
    const own = await getEmployeeBankAccount(employeeId, employee);
    expect(own).toEqual({
      accountHolderName: "Test Employee",
      maskedAccountNumber: "••••9012",
      ifsc: "HDFC0001234",
    });
    expect(JSON.stringify(own)).not.toContain("123456789012");
    expect((await getOwnEmployeeBankAccount(employee))?.accountNumber).toBe("123456789012");
    expect(await getOwnEmployeeBankAccount(admin)).toBeNull();
    await saveEmployeeBankAccount(
      employeeId,
      {
        accountHolderName: "Updated Employee",
        accountNumber: "",
        ifsc: "HDFC0001234",
      },
      admin,
    );
    expect((await getEmployeeBankAccount(employeeId, admin))?.maskedAccountNumber).toBe("••••9012");
    const logs = await db.query.activityLogs.findMany({
      where: eq(activityLogs.entityId, profileId),
    });
    expect(JSON.stringify(logs)).not.toContain("123456789012");
    expect(JSON.stringify(logs)).not.toContain("HDFC0001234");
  });

  it("works without a separate HR key", async () => {
    await db.delete(employeeBankAccounts).where(eq(employeeBankAccounts.staffProfileId, profileId));
    vi.stubEnv("HR_DATA_ENCRYPTION_KEY", "");
    await saveEmployeeBankAccount(
      employeeId,
      {
        accountHolderName: "Test Employee",
        accountNumber: "123456789012",
        ifsc: "HDFC0001234",
      },
      admin,
    );
    const row = await db.query.employeeBankAccounts.findFirst({
      where: eq(employeeBankAccounts.staffProfileId, profileId),
    });
    expect(row?.ciphertext).toMatch(/^v2:/);
    expect(row?.keyVersion).toBe(2);
    expect((await getOwnEmployeeBankAccount(employee))?.accountNumber).toBe("123456789012");
  });
});
