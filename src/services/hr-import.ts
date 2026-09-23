import { createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { departments, designations, workLocations } from "@/db/schema/hr";
import { employeeImportBatches } from "@/db/schema/hr-imports";
import { staffProfiles } from "@/db/schema/staff";
import { MAX_EMPLOYEE_IMPORT_BYTES, parseEmployeeCsv } from "@/lib/hr-csv";
import { recordActivity } from "@/services/activity-log";
import { assertHrCapability, type HrActor } from "@/services/hr";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Transaction;
type CsvRow = ReturnType<typeof parseEmployeeCsv>[number];

const rowSchema = z.object({
  email: z.email(),
  employee_code: z.string().min(1).max(50),
  legal_name: z.string().max(200),
  phone: z.union([z.literal(""), z.string().regex(/^\+?[0-9]{10,15}$/)]),
  personal_email: z.union([z.literal(""), z.email()]),
  department_code: z.string().max(30),
  designation_code: z.string().max(30),
  manager_email: z.union([z.literal(""), z.email()]),
  location_code: z.string().max(30),
  employment_category: z.union([
    z.literal(""),
    z.enum(["permanent", "probationer", "contract", "intern", "consultant"]),
  ]),
  join_date: z.iso.date(),
  payroll_eligible: z.enum(["true", "false"]),
});

type ValidRow = z.infer<typeof rowSchema>;
export type EmployeeImportPreviewRow = {
  rowNumber: number;
  email: string;
  employeeCode: string;
  operation: "create draft" | "update" | "invalid";
  errors: string[];
};

type ReadyRow = {
  userId: string;
  profileId: string | null;
  existingEmployeeCode: string | null;
  rowNumber: number;
  input: ValidRow;
  departmentId: string | null;
  designationId: string | null;
  workLocationId: string | null;
  managerUserId: string | null;
};

export class EmployeeImportValidationError extends Error {
  constructor(public readonly rows: EmployeeImportPreviewRow[]) {
    super("The employee CSV has row errors. Preview it again before committing.");
  }
}

function normalize(row: CsvRow) {
  return {
    email: row.values.email.toLowerCase(),
    employee_code: row.values.employee_code.toUpperCase(),
    legal_name: row.values.legal_name,
    phone: row.values.phone,
    personal_email: row.values.personal_email.toLowerCase(),
    department_code: row.values.department_code.toUpperCase(),
    designation_code: row.values.designation_code.toUpperCase(),
    manager_email: row.values.manager_email.toLowerCase(),
    location_code: row.values.location_code.toUpperCase(),
    employment_category: row.values.employment_category.toLowerCase(),
    join_date: row.values.join_date,
    payroll_eligible: row.values.payroll_eligible.toLowerCase(),
  };
}

function parseInput(csvText: string) {
  if (Buffer.byteLength(csvText, "utf8") > MAX_EMPLOYEE_IMPORT_BYTES) {
    throw new Error("Employee CSV exceeds the 1 MB limit.");
  }
  return parseEmployeeCsv(csvText);
}

async function analyze(rows: CsvRow[], executor: Executor) {
  const [users, profiles, departmentRows, designationRows, locationRows] = await Promise.all([
    executor.select({ id: user.id, email: user.email, banned: user.banned }).from(user),
    executor
      .select({
        id: staffProfiles.id,
        userId: staffProfiles.userId,
        employeeCode: staffProfiles.employeeCode,
        employmentStatus: staffProfiles.employmentStatus,
        joinDate: staffProfiles.joinDate,
        managerUserId: staffProfiles.managerUserId,
        deletedAt: staffProfiles.deletedAt,
      })
      .from(staffProfiles),
    executor
      .select({ id: departments.id, code: departments.code })
      .from(departments)
      .where(and(eq(departments.isActive, true), isNull(departments.deletedAt))),
    executor
      .select({ id: designations.id, code: designations.code })
      .from(designations)
      .where(and(eq(designations.isActive, true), isNull(designations.deletedAt))),
    executor
      .select({ id: workLocations.id, code: workLocations.code })
      .from(workLocations)
      .where(and(eq(workLocations.isActive, true), isNull(workLocations.deletedAt))),
  ]);
  const userByEmail = new Map(users.map((entry) => [entry.email.toLowerCase(), entry]));
  const profileByUser = new Map(profiles.map((entry) => [entry.userId, entry]));
  const ownerByCode = new Map(
    profiles
      .filter((entry) => entry.employeeCode)
      .map((entry) => [entry.employeeCode?.toUpperCase(), entry.userId]),
  );
  const departmentByCode = new Map(
    departmentRows.map((entry) => [entry.code.toUpperCase(), entry.id]),
  );
  const designationByCode = new Map(
    designationRows.map((entry) => [entry.code.toUpperCase(), entry.id]),
  );
  const locationByCode = new Map(locationRows.map((entry) => [entry.code.toUpperCase(), entry.id]));
  const seenEmails = new Set<string>();
  const seenCodes = new Set<string>();
  const preview: EmployeeImportPreviewRow[] = [];
  const ready: ReadyRow[] = [];

  for (const row of rows) {
    const raw = normalize(row);
    const parsed = rowSchema.safeParse(raw);
    const errors = parsed.success
      ? []
      : parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    const target = userByEmail.get(raw.email);
    const profile = target ? profileByUser.get(target.id) : undefined;
    if (seenEmails.has(raw.email)) errors.push("Duplicate email in this CSV.");
    if (seenCodes.has(raw.employee_code)) errors.push("Duplicate employee code in this CSV.");
    seenEmails.add(raw.email);
    seenCodes.add(raw.employee_code);
    if (!target) errors.push("No existing CRM account has this email.");
    if (target?.banned) errors.push("Account is banned; use the rehire workflow if exited.");
    if (profile?.deletedAt) errors.push("Employee profile is archived.");
    if (profile?.employmentStatus === "exited")
      errors.push("Use the rehire workflow for exited employees.");
    const codeOwner = ownerByCode.get(raw.employee_code);
    if (codeOwner && codeOwner !== target?.id)
      errors.push("Employee code belongs to another profile.");
    if (profile?.employeeCode && profile.employeeCode.toUpperCase() !== raw.employee_code) {
      errors.push("Existing employee code differs; edit that profile individually.");
    }
    if (profile?.joinDate && profile.joinDate !== raw.join_date) {
      errors.push("Existing join date differs; edit that profile individually.");
    }

    const departmentId = raw.department_code
      ? (departmentByCode.get(raw.department_code) ?? null)
      : null;
    const designationId = raw.designation_code
      ? (designationByCode.get(raw.designation_code) ?? null)
      : null;
    const workLocationId = raw.location_code
      ? (locationByCode.get(raw.location_code) ?? null)
      : null;
    if (raw.department_code && !departmentId)
      errors.push("Department code is not active or does not exist.");
    if (raw.designation_code && !designationId)
      errors.push("Designation code is not active or does not exist.");
    if (raw.location_code && !workLocationId)
      errors.push("Location code is not active or does not exist.");
    const manager = raw.manager_email ? userByEmail.get(raw.manager_email) : undefined;
    const managerProfile = manager ? profileByUser.get(manager.id) : undefined;
    if (
      raw.manager_email &&
      (!manager ||
        manager.banned ||
        !managerProfile ||
        managerProfile.deletedAt ||
        !["active", "probation", "notice"].includes(managerProfile.employmentStatus))
    ) {
      errors.push("Reporting manager must be an active employee account.");
    }
    if (manager?.id === target?.id) errors.push("An employee cannot report to themselves.");

    preview.push({
      rowNumber: row.rowNumber,
      email: raw.email,
      employeeCode: raw.employee_code,
      operation: errors.length ? "invalid" : profile ? "update" : "create draft",
      errors,
    });
    if (errors.length === 0 && target && parsed.success) {
      ready.push({
        userId: target.id,
        profileId: profile?.id ?? null,
        existingEmployeeCode: profile?.employeeCode ?? null,
        rowNumber: row.rowNumber,
        input: parsed.data,
        departmentId,
        designationId,
        workLocationId,
        managerUserId: manager?.id ?? null,
      });
    }
  }

  const proposedManagers = new Map(
    profiles
      .filter((entry) => !entry.deletedAt)
      .map((entry) => [entry.userId, entry.managerUserId]),
  );
  for (const row of ready) proposedManagers.set(row.userId, row.managerUserId);
  for (const row of ready) {
    const visited = new Set([row.userId]);
    let managerId = proposedManagers.get(row.userId);
    while (managerId) {
      if (visited.has(managerId)) {
        const item = preview.find((entry) => entry.rowNumber === row.rowNumber);
        if (item) {
          item.errors.push("Reporting line would create a cycle.");
          item.operation = "invalid";
        }
        break;
      }
      visited.add(managerId);
      managerId = proposedManagers.get(managerId) ?? null;
    }
  }
  return {
    rows: preview,
    ready: ready.filter(
      (row) => preview.find((entry) => entry.rowNumber === row.rowNumber)?.errors.length === 0,
    ),
  };
}

function fileHash(csvText: string) {
  return createHash("sha256").update(csvText, "utf8").digest("hex");
}

export async function previewEmployeeImport(csvText: string, actor: HrActor) {
  await assertHrCapability(actor, "hr_admin");
  const parsedRows = parseInput(csvText);
  const analysis = await analyze(parsedRows, db);
  if (analysis.rows.some((row) => row.errors.length)) {
    return { batchId: null, rows: analysis.rows };
  }
  const [batch] = await db
    .insert(employeeImportBatches)
    .values({
      actorId: actor.id,
      fileSha256: fileHash(csvText),
      rowCount: parsedRows.length,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    })
    .returning({ id: employeeImportBatches.id });
  if (!batch) throw new Error("Failed to prepare employee import.");
  return { batchId: batch.id, rows: analysis.rows };
}

export async function commitEmployeeImport(batchId: string, csvText: string, actor: HrActor) {
  await assertHrCapability(actor, "hr_admin");
  const parsedRows = parseInput(csvText);
  return db.transaction(
    async (tx) => {
      const [batch] = await tx
        .select()
        .from(employeeImportBatches)
        .where(eq(employeeImportBatches.id, batchId))
        .for("update")
        .limit(1);
      if (
        !batch ||
        batch.actorId !== actor.id ||
        batch.status !== "prepared" ||
        batch.expiresAt <= new Date()
      ) {
        throw new Error(
          "Import preview has expired or was already committed. Preview the CSV again.",
        );
      }
      if (batch.fileSha256 !== fileHash(csvText) || batch.rowCount !== parsedRows.length) {
        throw new Error("CSV changed after preview. Preview the file again.");
      }
      const analysis = await analyze(parsedRows, tx);
      if (analysis.rows.some((row) => row.errors.length)) {
        throw new EmployeeImportValidationError(analysis.rows);
      }
      for (const row of analysis.ready) {
        const values = {
          employeeCode: row.existingEmployeeCode ?? row.input.employee_code,
          legalName: row.input.legal_name || null,
          phone: row.input.phone || null,
          personalEmail: row.input.personal_email || null,
          departmentId: row.departmentId,
          designationId: row.designationId,
          managerUserId: row.managerUserId,
          workLocationId: row.workLocationId,
          employmentCategory: row.input.employment_category || null,
          joinDate: row.input.join_date,
          payrollEligible: row.input.payroll_eligible === "true",
          updatedBy: actor.id,
        };
        let profileId: string;
        if (row.profileId) {
          const [updated] = await tx
            .update(staffProfiles)
            .set(values)
            .where(eq(staffProfiles.id, row.profileId))
            .returning({ id: staffProfiles.id });
          if (!updated) throw new Error("Employee profile changed during import.");
          profileId = updated.id;
        } else {
          const [created] = await tx
            .insert(staffProfiles)
            .values({
              ...values,
              userId: row.userId,
              employmentStatus: "draft",
              createdBy: actor.id,
            })
            .returning({ id: staffProfiles.id });
          if (!created) throw new Error("Failed to create employee profile.");
          profileId = created.id;
        }
        await recordActivity(
          {
            actorId: actor.id,
            entityType: "staff_profile",
            entityId: profileId,
            action: row.profileId ? "hr_profile_import_updated" : "hr_profile_import_created",
            diff: { batchId, userId: row.userId, rowNumber: row.rowNumber },
          },
          tx,
        );
      }
      await tx
        .update(employeeImportBatches)
        .set({ status: "committed", committedAt: new Date() })
        .where(eq(employeeImportBatches.id, batchId));
      return {
        created: analysis.ready.filter((row) => !row.profileId).length,
        updated: analysis.ready.filter((row) => row.profileId).length,
      };
    },
    { isolationLevel: "serializable" },
  );
}
