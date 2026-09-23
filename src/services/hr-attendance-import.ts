import { createHash } from "node:crypto";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  attendanceImportBatches,
  attendancePeriodLocks,
  attendanceRecords,
} from "@/db/schema/attendance";
import { staffProfiles } from "@/db/schema/staff";
import { MAX_ATTENDANCE_IMPORT_BYTES, parseAttendanceCsv } from "@/lib/attendance-csv";
import { assertHrCapability, type HrActor } from "@/services/hr";
import { attendanceEntryInputSchema, resolveAttendanceEntry } from "@/services/hr-attendance";

const rowSchema = z.object({
  employee_code: z.string().trim().min(1).max(50),
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  first_in: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)]),
  last_out: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)]),
  status: z.enum(["present", "absent", "half_day", "missing_punch"]),
  note: z.string().max(500),
});

export type AttendanceImportPreviewRow = {
  rowNumber: number;
  employeeCode: string;
  workDate: string;
  operation: "create" | "update" | "invalid";
  derivedStatus: string | null;
  errors: string[];
};

type ReadyRow = {
  rowNumber: number;
  resolved: Awaited<ReturnType<typeof resolveAttendanceEntry>>;
};

export class AttendanceImportValidationError extends Error {
  constructor(public rows: AttendanceImportPreviewRow[]) {
    super("Attendance CSV has row errors. Preview it again before committing.");
  }
}

function hash(csv: string) {
  return createHash("sha256").update(csv, "utf8").digest("hex");
}

function parse(csv: string) {
  if (Buffer.byteLength(csv, "utf8") > MAX_ATTENDANCE_IMPORT_BYTES) {
    throw new Error("Attendance CSV exceeds the 1 MB limit.");
  }
  return parseAttendanceCsv(csv);
}

async function analyze(csv: string) {
  const rows = parse(csv);
  const profiles = await db
    .select({
      userId: staffProfiles.userId,
      employeeCode: staffProfiles.employeeCode,
      employmentStatus: staffProfiles.employmentStatus,
    })
    .from(staffProfiles)
    .where(isNull(staffProfiles.deletedAt));
  const profileByCode = new Map(
    profiles
      .filter((profile) => profile.employeeCode)
      .map((profile) => [profile.employeeCode?.toUpperCase(), profile]),
  );
  const seen = new Set<string>();
  const preview: AttendanceImportPreviewRow[] = [];
  const ready: ReadyRow[] = [];
  for (const row of rows) {
    const normalized = {
      ...row.values,
      employee_code: row.values.employee_code.toUpperCase(),
      status: row.values.status.toLowerCase(),
    };
    const parsed = rowSchema.safeParse(normalized);
    const errors = parsed.success
      ? []
      : parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    const profile = profileByCode.get(normalized.employee_code);
    if (!profile || !["active", "probation", "notice"].includes(profile.employmentStatus)) {
      errors.push("Employee code does not belong to an active employee.");
    }
    const key = `${normalized.employee_code}:${normalized.work_date}`;
    if (seen.has(key)) errors.push("Duplicate employee and work date in this CSV.");
    seen.add(key);
    let resolved: Awaited<ReturnType<typeof resolveAttendanceEntry>> | null = null;
    let existing = null;
    if (parsed.success && profile && errors.length === 0) {
      const input = attendanceEntryInputSchema.parse({
        employeeUserId: profile.userId,
        workDate: parsed.data.work_date,
        firstIn: parsed.data.first_in || undefined,
        lastOut: parsed.data.last_out || undefined,
        status: parsed.data.status,
        note: parsed.data.note || undefined,
      });
      try {
        [resolved, existing] = await Promise.all([
          resolveAttendanceEntry(input),
          db.query.attendanceRecords.findFirst({
            where: and(
              eq(attendanceRecords.employeeUserId, profile.userId),
              eq(attendanceRecords.workDate, parsed.data.work_date),
            ),
            columns: { lockedAt: true },
          }),
        ]);
        const periodLock = await db.query.attendancePeriodLocks.findFirst({
          where: and(
            isNull(attendancePeriodLocks.deletedAt),
            lte(attendancePeriodLocks.periodStart, parsed.data.work_date),
            gte(attendancePeriodLocks.periodEnd, parsed.data.work_date),
          ),
          columns: { id: true },
        });
        if (existing?.lockedAt || periodLock) errors.push("Attendance is locked for payroll.");
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "Could not derive attendance.");
      }
    }
    preview.push({
      rowNumber: row.rowNumber,
      employeeCode: normalized.employee_code,
      workDate: normalized.work_date,
      operation: errors.length ? "invalid" : existing ? "update" : "create",
      derivedStatus: resolved?.status ?? null,
      errors,
    });
    if (resolved && errors.length === 0) ready.push({ rowNumber: row.rowNumber, resolved });
  }
  return { rows: preview, ready, rowCount: rows.length };
}

export async function previewAttendanceImport(csv: string, actor: HrActor) {
  await assertHrCapability(actor, "hr_admin");
  const analysis = await analyze(csv);
  if (analysis.rows.some((row) => row.errors.length)) return { batchId: null, rows: analysis.rows };
  const [batch] = await db
    .insert(attendanceImportBatches)
    .values({
      actorId: actor.id,
      fileSha256: hash(csv),
      rowCount: analysis.rowCount,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    })
    .returning({ id: attendanceImportBatches.id });
  if (!batch) throw new Error("Failed to prepare attendance import.");
  return { batchId: batch.id, rows: analysis.rows };
}

export async function commitAttendanceImport(batchId: string, csv: string, actor: HrActor) {
  await assertHrCapability(actor, "hr_admin");
  const analysis = await analyze(csv);
  if (analysis.rows.some((row) => row.errors.length))
    throw new AttendanceImportValidationError(analysis.rows);
  return db.transaction(async (tx) => {
    const [batch] = await tx
      .select()
      .from(attendanceImportBatches)
      .where(eq(attendanceImportBatches.id, batchId))
      .for("update")
      .limit(1);
    if (
      !batch ||
      batch.actorId !== actor.id ||
      batch.status !== "prepared" ||
      batch.expiresAt <= new Date()
    ) {
      throw new Error("Import preview expired or was already committed. Preview the CSV again.");
    }
    if (batch.fileSha256 !== hash(csv) || batch.rowCount !== analysis.rowCount) {
      throw new Error("CSV changed after preview. Preview it again.");
    }
    for (const row of analysis.ready) {
      const periodLock = await tx.query.attendancePeriodLocks.findFirst({
        where: and(
          isNull(attendancePeriodLocks.deletedAt),
          lte(attendancePeriodLocks.periodStart, row.resolved.workDate),
          gte(attendancePeriodLocks.periodEnd, row.resolved.workDate),
        ),
        columns: { id: true },
      });
      const existing = await tx.query.attendanceRecords.findFirst({
        where: and(
          eq(attendanceRecords.employeeUserId, row.resolved.employeeUserId),
          eq(attendanceRecords.workDate, row.resolved.workDate),
        ),
        columns: { lockedAt: true },
      });
      if (periodLock || existing?.lockedAt)
        throw new Error("Attendance was locked after preview. Preview again.");
      await tx
        .insert(attendanceRecords)
        .values({ ...row.resolved, source: "csv", createdBy: actor.id, updatedBy: actor.id })
        .onConflictDoUpdate({
          target: [attendanceRecords.employeeUserId, attendanceRecords.workDate],
          set: { ...row.resolved, source: "csv", updatedBy: actor.id },
        });
    }
    await tx
      .update(attendanceImportBatches)
      .set({ status: "committed", committedAt: new Date() })
      .where(eq(attendanceImportBatches.id, batch.id));
    return { committed: analysis.ready.length };
  });
}
