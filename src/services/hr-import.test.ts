import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { activityLogs } from "@/db/schema/activity-logs";
import { user } from "@/db/schema/auth-schema";
import { employeeImportBatches } from "@/db/schema/hr-imports";
import { staffProfiles } from "@/db/schema/staff";
import { EMPLOYEE_IMPORT_COLUMNS } from "@/lib/hr-csv";
import { updateEmployeeProfile } from "@/services/hr";
import { commitEmployeeImport, previewEmployeeImport } from "@/services/hr-import";

describe("employee CSV import (integration)", () => {
  const adminId = randomUUID();
  const newEmployeeId = randomUUID();
  const existingEmployeeId = randomUUID();
  const admin = { id: adminId, role: "super_admin" as const };
  const newEmail = `import-new-${newEmployeeId}@test.local`;
  const existingEmail = `import-existing-${existingEmployeeId}@test.local`;
  const existingCode = `IMP-${existingEmployeeId.slice(0, 8)}`;
  const newCode = `IMP-${newEmployeeId.slice(0, 8)}`;
  let existingProfileId: string;

  function csvRow(email: string, code: string, overrides: Record<string, string> = {}) {
    const data: Record<string, string> = {
      email,
      employee_code: code,
      legal_name: "Import Employee",
      phone: "",
      personal_email: "",
      department_code: "",
      designation_code: "",
      manager_email: "",
      location_code: "",
      employment_category: "permanent",
      join_date: "2026-01-01",
      payroll_eligible: "true",
      ...overrides,
    };
    return EMPLOYEE_IMPORT_COLUMNS.map((column) => data[column]).join(",");
  }
  function csv(...rows: string[]) {
    return `${EMPLOYEE_IMPORT_COLUMNS.join(",")}\n${rows.join("\n")}\n`;
  }

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: adminId,
        name: "Import Admin",
        email: `import-admin-${adminId}@test.local`,
        role: "super_admin",
      },
      { id: newEmployeeId, name: "New Import Employee", email: newEmail, role: "executive" },
      {
        id: existingEmployeeId,
        name: "Existing Import Employee",
        email: existingEmail,
        role: "executive",
      },
    ]);
    existingProfileId = (
      await updateEmployeeProfile(
        existingEmployeeId,
        {
          employeeCode: existingCode,
          joinDate: "2026-01-01",
          employmentStatus: "active",
          payrollEligible: false,
        },
        admin,
      )
    ).id;
  });

  afterAll(async () => {
    const profiles = await db.query.staffProfiles.findMany({
      where: inArray(staffProfiles.userId, [newEmployeeId, existingEmployeeId]),
      columns: { id: true },
    });
    if (profiles.length)
      await db.delete(activityLogs).where(
        inArray(
          activityLogs.entityId,
          profiles.map((profile) => profile.id),
        ),
      );
    await db.delete(employeeImportBatches).where(eq(employeeImportBatches.actorId, adminId));
    await db
      .delete(staffProfiles)
      .where(inArray(staffProfiles.userId, [newEmployeeId, existingEmployeeId]));
    await db.delete(user).where(inArray(user.id, [adminId, newEmployeeId, existingEmployeeId]));
  });

  it("reports row errors and never prepares a partial batch", async () => {
    const preview = await previewEmployeeImport(
      csv(
        csvRow(newEmail, newCode),
        csvRow("missing@test.local", existingCode, { department_code: "UNKNOWN" }),
      ),
      admin,
    );
    expect(preview.batchId).toBeNull();
    expect(preview.rows[0]?.operation).toBe("create draft");
    expect(preview.rows[1]?.errors).toEqual(
      expect.arrayContaining([
        "No existing CRM account has this email.",
        "Employee code belongs to another profile.",
        "Department code is not active or does not exist.",
      ]),
    );
    expect(
      await db.query.staffProfiles.findFirst({ where: eq(staffProfiles.userId, newEmployeeId) }),
    ).toBeUndefined();
  });

  it("requires the exact previewed file and prevents replay", async () => {
    const source = csv(
      csvRow(newEmail, newCode),
      csvRow(existingEmail, existingCode, {
        legal_name: "Updated Legal Name",
        payroll_eligible: "true",
      }),
    );
    const preview = await previewEmployeeImport(source, admin);
    expect(preview.batchId).toBeTruthy();
    expect(preview.rows.map((row) => row.operation)).toEqual(["create draft", "update"]);
    if (!preview.batchId) throw new Error("Missing preview batch");
    await expect(commitEmployeeImport(preview.batchId, `${source} `, admin)).rejects.toThrow(
      "CSV changed",
    );
    await expect(
      commitEmployeeImport(preview.batchId, source, { id: newEmployeeId, role: "executive" }),
    ).rejects.toThrow("permission");
    const result = await commitEmployeeImport(preview.batchId, source, admin);
    expect(result).toEqual({ created: 1, updated: 1 });
    const [newProfile, existingProfile] = await Promise.all([
      db.query.staffProfiles.findFirst({ where: eq(staffProfiles.userId, newEmployeeId) }),
      db.query.staffProfiles.findFirst({ where: eq(staffProfiles.id, existingProfileId) }),
    ]);
    expect(newProfile).toMatchObject({
      employeeCode: newCode.toUpperCase(),
      employmentStatus: "draft",
      joinDate: "2026-01-01",
    });
    expect(existingProfile).toMatchObject({
      employmentStatus: "active",
      legalName: "Updated Legal Name",
      payrollEligible: true,
    });
    await expect(commitEmployeeImport(preview.batchId, source, admin)).rejects.toThrow(
      "already committed",
    );
    const batch = await db.query.employeeImportBatches.findFirst({
      where: eq(employeeImportBatches.id, preview.batchId),
    });
    expect(batch?.status).toBe("committed");
  });

  it("revalidates changed profiles at commit and writes nothing", async () => {
    const source = csv(
      csvRow(newEmail, newCode),
      csvRow(existingEmail, existingCode, { legal_name: "Should Not Be Saved" }),
    );
    const preview = await previewEmployeeImport(source, admin);
    if (!preview.batchId) throw new Error("Missing preview batch");
    await db
      .update(staffProfiles)
      .set({ joinDate: "2025-12-31" })
      .where(eq(staffProfiles.id, existingProfileId));
    try {
      await expect(commitEmployeeImport(preview.batchId, source, admin)).rejects.toThrow(
        "row errors",
      );
      const profile = await db.query.staffProfiles.findFirst({
        where: eq(staffProfiles.id, existingProfileId),
      });
      expect(profile?.legalName).toBe("Updated Legal Name");
      const batch = await db.query.employeeImportBatches.findFirst({
        where: eq(employeeImportBatches.id, preview.batchId),
      });
      expect(batch?.status).toBe("prepared");
    } finally {
      await db
        .update(staffProfiles)
        .set({ joinDate: "2026-01-01" })
        .where(eq(staffProfiles.id, existingProfileId));
    }
  });
});
