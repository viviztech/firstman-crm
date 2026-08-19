import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { activityLogs } from "@/db/schema/activity-logs";
import { user } from "@/db/schema/auth-schema";
import { services } from "@/db/schema/catalog";
import { staffProfiles } from "@/db/schema/staff";
import { makeScope } from "@/lib/test-scope";
import {
  getStaffScope,
  listStaffProfileSummaries,
  setStaffServiceAssignments,
  updateStaffTeam,
} from "@/services/staff";

describe("staff service — team (ADR 0002, integration)", () => {
  const managerId = randomUUID();
  const execId = randomUUID();
  const managerScope = makeScope(managerId, "manager");

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: managerId,
        name: "Staff Team Test Manager",
        email: `staff-team-manager-${managerId}@test.local`,
        emailVerified: true,
        role: "manager",
      },
      {
        id: execId,
        name: "Staff Team Test Exec",
        email: `staff-team-exec-${execId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(activityLogs).where(and(eq(activityLogs.entityType, "staff_profile")));
    await db.delete(staffProfiles).where(eq(staffProfiles.userId, execId));
    await db.delete(user).where(eq(user.id, managerId));
    await db.delete(user).where(eq(user.id, execId));
  });

  it("defaults to team: null when the user has no staff_profiles row", async () => {
    const scope = await getStaffScope(execId);
    expect(scope.team).toBeNull();
  });

  it("updateStaffTeam sets the team and getStaffScope reflects it", async () => {
    const updated = await updateStaffTeam(execId, "operations", managerScope);
    expect(updated.team).toBe("operations");

    const scope = await getStaffScope(execId);
    expect(scope.team).toBe("operations");
  });

  it("can be unset back to null", async () => {
    await updateStaffTeam(execId, "sales", managerScope);
    await updateStaffTeam(execId, null, managerScope);

    const scope = await getStaffScope(execId);
    expect(scope.team).toBeNull();
  });

  it("logs a team_changed activity entry", async () => {
    await updateStaffTeam(execId, "sales", managerScope);

    const profile = await db.query.staffProfiles.findFirst({
      where: eq(staffProfiles.userId, execId),
    });
    if (!profile) throw new Error("Expected a staff_profiles row after updateStaffTeam");

    const logs = await db.query.activityLogs.findMany({
      where: and(
        eq(activityLogs.entityType, "staff_profile"),
        eq(activityLogs.entityId, profile.id),
        eq(activityLogs.action, "team_changed"),
      ),
    });
    expect(logs.length).toBeGreaterThan(0);
  });

  it("listStaffProfileSummaries includes team for every profile", async () => {
    const summaries = await listStaffProfileSummaries();
    const execSummary = summaries.get(execId);
    expect(execSummary?.team).toBe("sales");
  });

  it("setStaffServiceAssignments logs a service_assignments_updated entry keyed by the staff profile id, not the user id", async () => {
    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration not found");

    // Regression test: entityId used to be passed as the better-auth userId (not a uuid), which
    // crashed the insert against activity_logs.entity_id (a uuid column) — see /settings/users.
    await setStaffServiceAssignments(execId, [service.id], managerScope);

    const profile = await db.query.staffProfiles.findFirst({
      where: eq(staffProfiles.userId, execId),
    });
    if (!profile) throw new Error("Expected a staff_profiles row after setStaffServiceAssignments");

    const logs = await db.query.activityLogs.findMany({
      where: and(
        eq(activityLogs.entityType, "staff_profile"),
        eq(activityLogs.entityId, profile.id),
        eq(activityLogs.action, "service_assignments_updated"),
      ),
    });
    expect(logs.length).toBeGreaterThan(0);

    const scope = await getStaffScope(execId);
    expect(scope.serviceIds).toContain(service.id);
  });
});
