import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import {
  leaveCarryForwardStates,
  leaveEntitlementStates,
  leaveLedger,
  leavePolicyAssignments,
  leaveTypes,
} from "@/db/schema/leave";
import { staffProfiles } from "@/db/schema/staff";
import { runLeaveEntitlementProvisioning } from "@/services/hr-leave-entitlements";

describe("leave entitlement provisioning (integration)", () => {
  const employeeId = randomUUID();
  let leaveTypeId = "";
  let policyId = "";

  beforeAll(async () => {
    await db.insert(user).values({
      id: employeeId,
      name: "Leave Provisioning Employee",
      email: `leave-provision-${employeeId}@test.local`,
      emailVerified: true,
      role: "executive",
    });
    await db.insert(staffProfiles).values({
      userId: employeeId,
      employeeCode: `LP-${employeeId.slice(0, 8)}`,
      employmentStatus: "active",
      joinDate: "2026-07-01",
    });
    const [type] = await db
      .insert(leaveTypes)
      .values({ code: `LP${employeeId.slice(0, 6)}`, name: "Provisioning leave" })
      .returning();
    if (!type) throw new Error("Failed to create leave type fixture");
    leaveTypeId = type.id;
    const [policy] = await db
      .insert(leavePolicyAssignments)
      .values({
        employeeUserId: employeeId,
        leaveTypeId,
        effectiveFrom: "2026-01-01",
        annualEntitlementHalfDays: 24,
      })
      .returning();
    if (!policy) throw new Error("Failed to create leave policy fixture");
    policyId = policy.id;
  });

  afterAll(async () => {
    await db.delete(leaveLedger).where(eq(leaveLedger.employeeUserId, employeeId));
    await db
      .delete(leaveEntitlementStates)
      .where(eq(leaveEntitlementStates.policyAssignmentId, policyId));
    await db
      .delete(leaveCarryForwardStates)
      .where(eq(leaveCarryForwardStates.employeeUserId, employeeId));
    await db.delete(leavePolicyAssignments).where(eq(leavePolicyAssignments.id, policyId));
    await db.delete(leaveTypes).where(eq(leaveTypes.id, leaveTypeId));
    await db.delete(staffProfiles).where(eq(staffProfiles.userId, employeeId));
    await db.delete(user).where(eq(user.id, employeeId));
  });

  it("posts a prorated target once and remains idempotent", async () => {
    await runLeaveEntitlementProvisioning(2026);

    await runLeaveEntitlementProvisioning(2026);

    const rows = await db.query.leaveLedger.findMany({
      where: eq(leaveLedger.employeeUserId, employeeId),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.amountHalfDays).toBe(12);
  });

  it("appends a correcting delta when the employment end date changes", async () => {
    await db
      .update(staffProfiles)
      .set({ lastWorkingDate: "2026-09-30" })
      .where(eq(staffProfiles.userId, employeeId));

    await runLeaveEntitlementProvisioning(2026);

    const rows = await db.query.leaveLedger.findMany({
      where: eq(leaveLedger.employeeUserId, employeeId),
    });
    expect(rows.reduce((total, row) => total + row.amountHalfDays, 0)).toBe(6);
  });
});
