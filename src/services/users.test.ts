import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { services } from "@/db/schema/catalog";
import { makeScope } from "@/lib/test-scope";
import { setStaffServiceAssignments, updateStaffTeam } from "@/services/staff";
import {
  getUserContact,
  listAllStaffForAdmin,
  listAssignableStaff,
  listAssignableStaffForService,
  listExecutives,
  listStaffEmailsByRole,
} from "@/services/users";

describe("listAssignableStaff (integration)", () => {
  it("returns only super_admin, manager, and executive users, ordered by name", async () => {
    const staff = await listAssignableStaff();

    expect(staff.length).toBeGreaterThan(0);
    for (const member of staff) {
      expect(["super_admin", "manager", "executive"]).toContain(member.role);
    }

    const names = staff.map((member) => member.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

describe("notification-related user lookups (integration)", () => {
  const managerId = randomUUID();
  const accountantId = randomUUID();
  const execId = randomUUID();

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: managerId,
        name: "Notify Test Manager",
        email: `notify-manager-${managerId}@test.local`,
        emailVerified: true,
        role: "manager",
      },
      {
        id: accountantId,
        name: "Notify Test Accountant",
        email: `notify-accountant-${accountantId}@test.local`,
        emailVerified: true,
        role: "accountant",
      },
      {
        id: execId,
        name: "Notify Test Exec",
        email: `notify-exec-${execId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, managerId));
    await db.delete(user).where(eq(user.id, accountantId));
    await db.delete(user).where(eq(user.id, execId));
  });

  it("getUserContact returns the user's id/name/email, or undefined if missing", async () => {
    const contact = await getUserContact(execId);
    expect(contact?.name).toBe("Notify Test Exec");
    expect(contact?.email).toContain("notify-exec-");

    expect(await getUserContact(randomUUID())).toBeUndefined();
  });

  it("listExecutives returns only executives", async () => {
    const executives = await listExecutives();
    const ids = executives.map((row) => row.id);
    expect(ids).toContain(execId);
    expect(ids).not.toContain(managerId);
    expect(ids).not.toContain(accountantId);
  });

  it("listStaffEmailsByRole returns emails for exactly the requested roles", async () => {
    const emails = await listStaffEmailsByRole(["manager", "accountant"]);
    const managerContact = await getUserContact(managerId);
    const accountantContact = await getUserContact(accountantId);
    const execContact = await getUserContact(execId);

    expect(emails).toContain(managerContact?.email);
    expect(emails).toContain(accountantContact?.email);
    expect(emails).not.toContain(execContact?.email);
  });

  it("listAllStaffForAdmin includes every role with id/name/email/role/banned/createdAt", async () => {
    const roster = await listAllStaffForAdmin();
    const manager = roster.find((row) => row.id === managerId);
    const accountant = roster.find((row) => row.id === accountantId);
    const exec = roster.find((row) => row.id === execId);

    expect(manager).toMatchObject({ name: "Notify Test Manager", role: "manager", banned: false });
    expect(accountant).toMatchObject({ role: "accountant" });
    expect(exec).toMatchObject({ role: "executive" });
    expect(manager?.createdAt).toBeInstanceOf(Date);
  });
});

describe("listAssignableStaffForService (integration, ADR 0004)", () => {
  const managerId = randomUUID();
  const opsExecId = randomUUID();
  const salesExecId = randomUUID();
  const managerScope = makeScope(managerId, "manager");
  let pvtLtdServiceId: string;
  let gstServiceId: string;

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: managerId,
        name: "Assignable Staff Test Manager",
        email: `assignable-staff-manager-${managerId}@test.local`,
        emailVerified: true,
        role: "manager",
      },
      {
        id: opsExecId,
        name: "Assignable Staff Test Ops Exec",
        email: `assignable-staff-ops-${opsExecId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: salesExecId,
        name: "Assignable Staff Test Sales Exec",
        email: `assignable-staff-sales-${salesExecId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
    ]);
    await updateStaffTeam(opsExecId, "operations", managerScope);
    await updateStaffTeam(salesExecId, "sales", managerScope);

    const pvtLtd = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!pvtLtd) throw new Error("Seed catalog first — pvt-ltd-registration service not found");
    pvtLtdServiceId = pvtLtd.id;

    const gst = await db.query.services.findFirst({
      where: eq(services.slug, "gst-registration"),
    });
    if (!gst) throw new Error("Seed catalog first — gst-registration service not found");
    gstServiceId = gst.id;
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, managerId));
    await db.delete(user).where(eq(user.id, opsExecId));
    await db.delete(user).where(eq(user.id, salesExecId));
  });

  it("excludes an operations executive not scoped to the given service", async () => {
    await setStaffServiceAssignments(opsExecId, [gstServiceId], managerScope);

    const staff = await listAssignableStaffForService(pvtLtdServiceId);
    expect(staff.map((member) => member.id)).not.toContain(opsExecId);
  });

  it("includes an operations executive scoped to the given service", async () => {
    await setStaffServiceAssignments(opsExecId, [pvtLtdServiceId], managerScope);

    const staff = await listAssignableStaffForService(pvtLtdServiceId);
    expect(staff.map((member) => member.id)).toContain(opsExecId);
  });

  it("excludes an operations executive with zero service assignments (mandatory scoping)", async () => {
    await setStaffServiceAssignments(opsExecId, [], managerScope);

    const staff = await listAssignableStaffForService(pvtLtdServiceId);
    expect(staff.map((member) => member.id)).not.toContain(opsExecId);
  });

  it("never excludes a non-operations executive, regardless of service scope", async () => {
    await setStaffServiceAssignments(salesExecId, [], managerScope);

    const staff = await listAssignableStaffForService(pvtLtdServiceId);
    expect(staff.map((member) => member.id)).toContain(salesExecId);
  });
});
