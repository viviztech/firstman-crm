import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { activityLogs } from "@/db/schema/activity-logs";
import { user } from "@/db/schema/auth-schema";
import { employeeDocuments } from "@/db/schema/hr-documents";
import { staffProfiles } from "@/db/schema/staff";
import { getStorageDriver } from "@/lib/storage";
import { updateEmployeeProfile } from "@/services/hr";
import {
  auditEmployeeDocumentDownload,
  getEmployeeDocumentForDownload,
  listEmployeeDocuments,
  uploadEmployeeDocument,
} from "@/services/hr-documents";

describe("employee documents (integration)", () => {
  const adminId = randomUUID();
  const employeeId = randomUUID();
  const unrelatedId = randomUUID();
  const admin = { id: adminId, role: "super_admin" as const };
  const employee = { id: employeeId, role: "executive" as const };
  const unrelated = { id: unrelatedId, role: "manager" as const };
  const pdf = Buffer.from("%PDF-1.4\nHR integration test\n");
  let profileId: string;
  let documentId: string;
  let storageKey: string;

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: adminId,
        name: "HR Document Admin",
        email: `hr-doc-admin-${adminId}@test.local`,
        role: "super_admin",
      },
      {
        id: employeeId,
        name: "HR Document Employee",
        email: `hr-doc-employee-${employeeId}@test.local`,
        role: "executive",
      },
      {
        id: unrelatedId,
        name: "HR Document Stranger",
        email: `hr-doc-stranger-${unrelatedId}@test.local`,
        role: "manager",
      },
    ]);
    profileId = (
      await updateEmployeeProfile(
        employeeId,
        {
          employeeCode: `DOC-${employeeId.slice(0, 8)}`,
          employmentStatus: "active",
          payrollEligible: true,
        },
        admin,
      )
    ).id;
  });

  afterAll(async () => {
    if (documentId) await db.delete(activityLogs).where(eq(activityLogs.entityId, documentId));
    await db.delete(activityLogs).where(eq(activityLogs.entityId, profileId));
    await db.delete(employeeDocuments).where(eq(employeeDocuments.staffProfileId, profileId));
    if (storageKey) await getStorageDriver().delete(storageKey);
    await db.delete(staffProfiles).where(eq(staffProfiles.id, profileId));
    await db.delete(user).where(inArray(user.id, [adminId, employeeId, unrelatedId]));
  });

  it("rejects employee uploads, unrelated reads, and spoofed files", async () => {
    const input = { userId: employeeId, type: "offer_letter" as const, label: "Offer letter" };
    await expect(uploadEmployeeDocument(input, pdf, employee)).rejects.toThrow("permission");
    await expect(listEmployeeDocuments(employeeId, unrelated)).rejects.toThrow("permission");
    await expect(uploadEmployeeDocument(input, Buffer.from("not a PDF"), admin)).rejects.toThrow(
      "Only PDF",
    );
  });

  it("stores a private file and exposes only metadata to employee and HR", async () => {
    const created = await uploadEmployeeDocument(
      {
        userId: employeeId,
        type: "offer_letter",
        label: "Offer letter",
        expiryDate: "2030-12-31",
      },
      pdf,
      admin,
    );
    documentId = created.id;
    const row = await db.query.employeeDocuments.findFirst({
      where: eq(employeeDocuments.id, documentId),
    });
    storageKey = row?.storageKey ?? "";
    expect(storageKey).toMatch(/^hr\/employees\//);
    const own = await listEmployeeDocuments(employeeId, employee);
    expect(own).toHaveLength(1);
    expect(own[0]?.label).toBe("Offer letter");
    expect(JSON.stringify(own)).not.toContain("storageKey");
    expect(JSON.stringify(own)).not.toContain(storageKey);
    expect(await listEmployeeDocuments(employeeId, admin)).toHaveLength(1);
    expect(await getEmployeeDocumentForDownload(documentId, unrelated)).toBeNull();
    const download = await getEmployeeDocumentForDownload(documentId, employee);
    expect(download?.storageKey).toBe(storageKey);
    expect(await getStorageDriver().read(storageKey)).toEqual(pdf);
    await auditEmployeeDocumentDownload(documentId, employee);
    const logs = await db.query.activityLogs.findMany({
      where: eq(activityLogs.entityId, documentId),
    });
    expect(logs.map((log) => log.action)).toEqual(
      expect.arrayContaining(["uploaded", "downloaded"]),
    );
    expect(JSON.stringify(logs)).not.toContain(storageKey);
  });
});
