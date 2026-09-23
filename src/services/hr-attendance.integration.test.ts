import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { attendanceRecords, shiftAssignments, shifts } from "@/db/schema/attendance";
import { user } from "@/db/schema/auth-schema";
import { leaveRequests, leaveTypes } from "@/db/schema/leave";
import { staffProfiles } from "@/db/schema/staff";
import { assignShift, createShift, saveAttendanceEntry } from "@/services/hr-attendance";

describe("attendance service (integration)", () => {
  const adminId = randomUUID();
  const employeeId = randomUUID();
  const actor = { id: adminId, role: "super_admin" as const };
  let shiftId = "";
  let leaveTypeId = "";

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: adminId,
        name: "Attendance Admin",
        email: `attendance-admin-${adminId}@test.local`,
        emailVerified: true,
        role: "super_admin",
      },
      {
        id: employeeId,
        name: "Attendance Employee",
        email: `attendance-employee-${employeeId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
    ]);
    await db.insert(staffProfiles).values({
      userId: employeeId,
      employeeCode: `AT-${employeeId.slice(0, 8)}`,
      employmentStatus: "active",
      joinDate: "2026-01-01",
    });
    const shift = await createShift(
      {
        code: `AT${employeeId.slice(0, 6)}`,
        name: "Attendance test shift",
        startTime: "09:00",
        endTime: "18:00",
        breakMinutes: 60,
        fullDayMinutes: 480,
        halfDayMinutes: 240,
        crossesMidnight: false,
      },
      actor,
    );
    if (!shift) throw new Error("Shift fixture failed");
    shiftId = shift.id;
    await assignShift({ employeeUserId: employeeId, shiftId, effectiveFrom: "2026-01-01" }, actor);
  });

  afterAll(async () => {
    await db.delete(attendanceRecords).where(eq(attendanceRecords.employeeUserId, employeeId));
    await db.delete(leaveRequests).where(eq(leaveRequests.employeeUserId, employeeId));
    if (leaveTypeId) await db.delete(leaveTypes).where(eq(leaveTypes.id, leaveTypeId));
    await db.delete(shiftAssignments).where(eq(shiftAssignments.employeeUserId, employeeId));
    if (shiftId) await db.delete(shifts).where(eq(shifts.id, shiftId));
    await db.delete(staffProfiles).where(eq(staffProfiles.userId, employeeId));
    await db.delete(user).where(inArray(user.id, [adminId, employeeId]));
  });

  it("calculates worked time against the effective shift", async () => {
    const saved = await saveAttendanceEntry(
      {
        employeeUserId: employeeId,
        workDate: "2026-09-23",
        firstIn: "2026-09-23T09:00",
        lastOut: "2026-09-23T18:00",
        status: "present",
      },
      "manual",
      actor,
    );
    expect(saved?.status).toBe("present");
    expect(saved?.workMinutes).toBe(480);
    expect(saved?.shiftId).toBe(shiftId);
  });

  it("preserves approved leave over a manual or imported status", async () => {
    const [type] = await db
      .insert(leaveTypes)
      .values({ code: `ATL${employeeId.slice(0, 5)}`, name: "Attendance leave", isPaid: false })
      .returning();
    if (!type) throw new Error("Leave type fixture failed");
    leaveTypeId = type.id;
    await db.insert(leaveRequests).values({
      employeeUserId: employeeId,
      leaveTypeId,
      startDate: "2026-09-24",
      endDate: "2026-09-24",
      requestedHalfDays: 2,
      reason: "Attendance derivation test",
      status: "approved",
    });
    const saved = await saveAttendanceEntry(
      { employeeUserId: employeeId, workDate: "2026-09-24", status: "absent" },
      "csv",
      actor,
    );
    expect(saved?.status).toBe("leave");
  });

  it("rejects changes to a locked daily record", async () => {
    await db
      .update(attendanceRecords)
      .set({ lockedAt: new Date(), lockedBy: adminId, lockReason: "Payroll test" })
      .where(
        and(
          eq(attendanceRecords.employeeUserId, employeeId),
          eq(attendanceRecords.workDate, "2026-09-23"),
        ),
      );
    await expect(
      saveAttendanceEntry(
        { employeeUserId: employeeId, workDate: "2026-09-23", status: "absent" },
        "manual",
        actor,
      ),
    ).rejects.toThrow("locked for payroll");
  });
});
