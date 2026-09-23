import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import {
  departments,
  designations,
  hrCapabilityAssignments,
  type hrCapabilityEnum,
  workLocations,
} from "@/db/schema/hr";
import { employmentCategoryEnum, employmentStatusEnum, staffProfiles } from "@/db/schema/staff";
import type { Role } from "@/lib/auth";
import { optionalEmailSchema, optionalTrimmed } from "@/lib/validation/helpers";
import { recordActivity } from "@/services/activity-log";

export type HrCapability = (typeof hrCapabilityEnum.enumValues)[number];
export type HrActor = { id: string; role: Role };

const ALL_HR_CAPABILITIES: HrCapability[] = ["hr_admin", "payroll_admin"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const optionalDate = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().regex(ISO_DATE, "Enter a valid date").optional(),
);

const optionalSelection = z.preprocess(
  (value) => (value === "" || value === "none" ? undefined : value),
  z.string().uuid("Invalid selection").optional(),
);

export const employeeProfileInputSchema = z
  .object({
    employeeCode: z.string().trim().min(1, "Employee code is required").max(50),
    legalName: optionalTrimmed(200),
    phone: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z
        .string()
        .trim()
        .regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number")
        .optional(),
    ),
    personalEmail: optionalEmailSchema,
    departmentId: optionalSelection,
    designationId: optionalSelection,
    managerUserId: z.preprocess(
      (value) => (value === "" || value === "none" ? undefined : value),
      z.string().trim().min(1).optional(),
    ),
    workLocationId: optionalSelection,
    employmentStatus: z.enum(employmentStatusEnum.enumValues),
    employmentCategory: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.enum(employmentCategoryEnum.enumValues).optional(),
    ),
    joinDate: optionalDate,
    confirmationDate: optionalDate,
    noticeStartDate: optionalDate,
    lastWorkingDate: optionalDate,
    payrollEligible: z.preprocess(
      (value) => value === "true" || value === "on" || value === true,
      z.boolean(),
    ),
  })
  .superRefine((data, context) => {
    if (data.employmentStatus === "exited" && !data.lastWorkingDate) {
      context.addIssue({
        code: "custom",
        path: ["lastWorkingDate"],
        message: "Last working date is required for an exited employee",
      });
    }
    if (data.confirmationDate && data.joinDate && data.confirmationDate < data.joinDate) {
      context.addIssue({
        code: "custom",
        path: ["confirmationDate"],
        message: "Confirmation date cannot be before join date",
      });
    }
  });

export type EmployeeProfileInput = z.infer<typeof employeeProfileInputSchema>;

export const organizationUnitInputSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(150),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Code is required")
    .max(30)
    .regex(/^[A-Z0-9_-]+$/, "Use letters, numbers, dashes, or underscores"),
});

export const workLocationInputSchema = organizationUnitInputSchema.extend({
  address: optionalTrimmed(500),
  state: optionalTrimmed(100),
  timezone: z.string().trim().min(1).max(100).default("Asia/Kolkata"),
});

export async function getHrCapabilities(actor: HrActor): Promise<HrCapability[]> {
  if (actor.role === "super_admin") return ALL_HR_CAPABILITIES;
  const rows = await db
    .select({ capability: hrCapabilityAssignments.capability })
    .from(hrCapabilityAssignments)
    .where(
      and(eq(hrCapabilityAssignments.userId, actor.id), isNull(hrCapabilityAssignments.deletedAt)),
    );
  return rows.map((row) => row.capability);
}

export async function hasHrCapability(actor: HrActor, capability: HrCapability) {
  if (actor.role === "super_admin") return true;
  const row = await db.query.hrCapabilityAssignments.findFirst({
    where: and(
      eq(hrCapabilityAssignments.userId, actor.id),
      eq(hrCapabilityAssignments.capability, capability),
      isNull(hrCapabilityAssignments.deletedAt),
    ),
    columns: { id: true },
  });
  return Boolean(row);
}

export async function assertHrCapability(actor: HrActor, capability: HrCapability) {
  if (!(await hasHrCapability(actor, capability))) {
    throw new Error("You do not have permission to perform this HR action.");
  }
}

export async function listOrganizationOptions() {
  const [departmentRows, designationRows, locationRows] = await Promise.all([
    db
      .select({ id: departments.id, name: departments.name, code: departments.code })
      .from(departments)
      .where(and(isNull(departments.deletedAt), eq(departments.isActive, true)))
      .orderBy(sql`lower(${departments.name})`),
    db
      .select({ id: designations.id, name: designations.name, code: designations.code })
      .from(designations)
      .where(and(isNull(designations.deletedAt), eq(designations.isActive, true)))
      .orderBy(sql`lower(${designations.name})`),
    db
      .select({ id: workLocations.id, name: workLocations.name, code: workLocations.code })
      .from(workLocations)
      .where(and(isNull(workLocations.deletedAt), eq(workLocations.isActive, true)))
      .orderBy(sql`lower(${workLocations.name})`),
  ]);
  return { departments: departmentRows, designations: designationRows, locations: locationRows };
}

export async function listEmployeeDirectory() {
  return listEmployeeRows(false);
}

function listEmployeeRows(includeBanned: boolean) {
  return db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeCode: staffProfiles.employeeCode,
      employeeType: staffProfiles.employeeType,
      team: staffProfiles.team,
      employmentStatus: staffProfiles.employmentStatus,
      departmentName: departments.name,
      designationName: designations.name,
      locationName: workLocations.name,
      managerUserId: staffProfiles.managerUserId,
    })
    .from(user)
    .leftJoin(staffProfiles, eq(staffProfiles.userId, user.id))
    .leftJoin(departments, eq(staffProfiles.departmentId, departments.id))
    .leftJoin(designations, eq(staffProfiles.designationId, designations.id))
    .leftJoin(workLocations, eq(staffProfiles.workLocationId, workLocations.id))
    .where(includeBanned ? undefined : eq(user.banned, false))
    .orderBy(sql`lower(${user.name})`);
}

export async function listEmployeesForHr(actor: HrActor) {
  await assertHrCapability(actor, "hr_admin");
  return listEmployeeRows(true);
}

export async function getEmployeeProfileForHr(userId: string, actor: HrActor) {
  await assertHrCapability(actor, "hr_admin");
  const rows = await db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeType: staffProfiles.employeeType,
      team: staffProfiles.team,
      employeeCode: staffProfiles.employeeCode,
      legalName: staffProfiles.legalName,
      phone: staffProfiles.phone,
      personalEmail: staffProfiles.personalEmail,
      departmentId: staffProfiles.departmentId,
      designationId: staffProfiles.designationId,
      managerUserId: staffProfiles.managerUserId,
      workLocationId: staffProfiles.workLocationId,
      employmentStatus: staffProfiles.employmentStatus,
      employmentCategory: staffProfiles.employmentCategory,
      joinDate: staffProfiles.joinDate,
      confirmationDate: staffProfiles.confirmationDate,
      noticeStartDate: staffProfiles.noticeStartDate,
      lastWorkingDate: staffProfiles.lastWorkingDate,
      payrollEligible: staffProfiles.payrollEligible,
    })
    .from(user)
    .leftJoin(staffProfiles, eq(staffProfiles.userId, user.id))
    .where(eq(user.id, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getEmployeeSelfProfile(userId: string) {
  const rows = await db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeCode: staffProfiles.employeeCode,
      legalName: staffProfiles.legalName,
      phone: staffProfiles.phone,
      personalEmail: staffProfiles.personalEmail,
      employeeType: staffProfiles.employeeType,
      team: staffProfiles.team,
      employmentStatus: staffProfiles.employmentStatus,
      employmentCategory: staffProfiles.employmentCategory,
      joinDate: staffProfiles.joinDate,
      confirmationDate: staffProfiles.confirmationDate,
      departmentName: departments.name,
      designationName: designations.name,
      locationName: workLocations.name,
    })
    .from(user)
    .leftJoin(staffProfiles, eq(staffProfiles.userId, user.id))
    .leftJoin(departments, eq(staffProfiles.departmentId, departments.id))
    .leftJoin(designations, eq(staffProfiles.designationId, designations.id))
    .leftJoin(workLocations, eq(staffProfiles.workLocationId, workLocations.id))
    .where(eq(user.id, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateEmployeeProfile(
  userId: string,
  input: EmployeeProfileInput,
  actor: HrActor,
) {
  await assertHrCapability(actor, "hr_admin");
  if (input.managerUserId === userId) throw new Error("An employee cannot report to themselves.");

  return db.transaction(async (tx) => {
    const target = await tx.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { id: true },
    });
    if (!target) throw new Error("Employee account not found.");

    const current = await tx.query.staffProfiles.findFirst({
      where: eq(staffProfiles.userId, userId),
      columns: {
        id: true,
        employmentStatus: true,
        confirmationDate: true,
        noticeStartDate: true,
        lastWorkingDate: true,
      },
    });
    if (current?.employmentStatus === "exited") {
      throw new Error("Use the rehire workflow before editing an exited employee.");
    }
    if (
      input.employmentStatus === "exited" ||
      (current && input.employmentStatus !== current.employmentStatus)
    ) {
      throw new Error("Use the employment lifecycle workflow to change status.");
    }

    const values = {
      ...input,
      departmentId: input.departmentId ?? null,
      designationId: input.designationId ?? null,
      managerUserId: input.managerUserId ?? null,
      workLocationId: input.workLocationId ?? null,
      employmentCategory: input.employmentCategory ?? null,
      legalName: input.legalName ?? null,
      phone: input.phone ?? null,
      personalEmail: input.personalEmail ?? null,
      joinDate: input.joinDate ?? null,
      confirmationDate: current?.confirmationDate ?? null,
      noticeStartDate: current?.noticeStartDate ?? null,
      lastWorkingDate: current?.lastWorkingDate ?? null,
      updatedBy: actor.id,
    };

    const [saved] = current
      ? await tx
          .update(staffProfiles)
          .set(values)
          .where(eq(staffProfiles.id, current.id))
          .returning()
      : await tx
          .insert(staffProfiles)
          .values({ ...values, userId, createdBy: actor.id })
          .returning();
    if (!saved) throw new Error("Failed to save employee profile.");

    await recordActivity(
      {
        actorId: actor.id,
        entityType: "staff_profile",
        entityId: saved.id,
        action: current ? "hr_profile_updated" : "hr_profile_created",
        diff: {
          userId,
          employeeCode: input.employeeCode,
          employmentStatus: input.employmentStatus,
          departmentId: input.departmentId ?? null,
          designationId: input.designationId ?? null,
          managerUserId: input.managerUserId ?? null,
          workLocationId: input.workLocationId ?? null,
          payrollEligible: input.payrollEligible,
        },
      },
      tx,
    );
    return saved;
  });
}

export async function createDepartment(
  input: z.infer<typeof organizationUnitInputSchema>,
  actor: HrActor,
) {
  await assertHrCapability(actor, "hr_admin");
  return createOrganizationRow(departments, "department", input, actor);
}

export async function createDesignation(
  input: z.infer<typeof organizationUnitInputSchema>,
  actor: HrActor,
) {
  await assertHrCapability(actor, "hr_admin");
  return createOrganizationRow(designations, "designation", input, actor);
}

export async function createWorkLocation(
  input: z.infer<typeof workLocationInputSchema>,
  actor: HrActor,
) {
  await assertHrCapability(actor, "hr_admin");
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(workLocations)
      .values({ ...input, createdBy: actor.id, updatedBy: actor.id })
      .returning();
    if (!created) throw new Error("Failed to create work location.");
    await recordActivity(
      {
        actorId: actor.id,
        entityType: "work_location",
        entityId: created.id,
        action: "created",
        diff: input,
      },
      tx,
    );
    return created;
  });
}

type SimpleOrganizationTable = typeof departments | typeof designations;

async function createOrganizationRow(
  table: SimpleOrganizationTable,
  entityType: "department" | "designation",
  input: z.infer<typeof organizationUnitInputSchema>,
  actor: HrActor,
) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(table)
      .values({ ...input, createdBy: actor.id, updatedBy: actor.id })
      .returning();
    if (!created) throw new Error(`Failed to create ${entityType}.`);
    await recordActivity(
      {
        actorId: actor.id,
        entityType,
        entityId: created.id,
        action: "created",
        diff: input,
      },
      tx,
    );
    return created;
  });
}

export async function setHrCapability(
  userId: string,
  capability: HrCapability,
  enabled: boolean,
  actor: HrActor,
) {
  if (actor.role !== "super_admin") {
    throw new Error("Only a super administrator can assign HR capabilities.");
  }
  if (userId === actor.id && !enabled) {
    throw new Error("Super administrators have implicit HR capabilities.");
  }

  return db.transaction(async (tx) => {
    const existing = await tx.query.hrCapabilityAssignments.findFirst({
      where: and(
        eq(hrCapabilityAssignments.userId, userId),
        eq(hrCapabilityAssignments.capability, capability),
      ),
    });

    let assignmentId: string;
    if (existing) {
      const [updated] = await tx
        .update(hrCapabilityAssignments)
        .set({ deletedAt: enabled ? null : new Date(), updatedBy: actor.id })
        .where(eq(hrCapabilityAssignments.id, existing.id))
        .returning({ id: hrCapabilityAssignments.id });
      if (!updated) throw new Error("Failed to update HR capability.");
      assignmentId = updated.id;
    } else {
      if (!enabled) return;
      const [created] = await tx
        .insert(hrCapabilityAssignments)
        .values({ userId, capability, createdBy: actor.id, updatedBy: actor.id })
        .returning({ id: hrCapabilityAssignments.id });
      if (!created) throw new Error("Failed to assign HR capability.");
      assignmentId = created.id;
    }

    await recordActivity(
      {
        actorId: actor.id,
        entityType: "hr_capability_assignment",
        entityId: assignmentId,
        action: enabled ? "granted" : "revoked",
        diff: { userId, capability },
      },
      tx,
    );
  });
}

export async function listCapabilityAssignments(actor: HrActor) {
  if (actor.role !== "super_admin") return new Map<string, HrCapability[]>();
  const rows = await db
    .select({
      userId: hrCapabilityAssignments.userId,
      capability: hrCapabilityAssignments.capability,
    })
    .from(hrCapabilityAssignments)
    .where(isNull(hrCapabilityAssignments.deletedAt));
  const result = new Map<string, HrCapability[]>();
  for (const row of rows) {
    const current = result.get(row.userId) ?? [];
    current.push(row.capability);
    result.set(row.userId, current);
  }
  return result;
}
