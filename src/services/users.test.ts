import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import {
  getUserContact,
  listAllStaffForAdmin,
  listAssignableStaff,
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
