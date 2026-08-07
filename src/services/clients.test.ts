import { randomUUID } from "node:crypto";
import { eq, ilike } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { clients } from "@/db/schema/clients";
import { makeScope } from "@/lib/test-scope";
import {
  type ClientInput,
  clientInputSchema,
  createClient,
  deleteClient,
  getClient,
  getClientForNotification,
  listClientOptions,
  listClients,
  setWhatsAppOptOut,
  updateClient,
} from "@/services/clients";

function input(phone: string, overrides: Partial<ClientInput> = {}): ClientInput {
  return clientInputSchema.parse({
    type: "individual",
    name: "Scoping Test Client",
    phone,
    ...overrides,
  });
}

describe("clients service — executive scoping (integration)", () => {
  const managerId = randomUUID();
  const execAId = randomUUID();
  const execBId = randomUUID();

  const managerScope = makeScope(managerId, "manager");
  const execAScope = makeScope(execAId, "executive");
  const execBScope = makeScope(execBId, "executive");

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: managerId,
        name: "Test Manager",
        email: `manager-${managerId}@test.local`,
        emailVerified: true,
        role: "manager",
      },
      {
        id: execAId,
        name: "Test Exec A",
        email: `execA-${execAId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: execBId,
        name: "Test Exec B",
        email: `execB-${execBId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(clients).where(ilike(clients.phone, "+919876500%"));
    await db.delete(user).where(eq(user.id, managerId));
    await db.delete(user).where(eq(user.id, execAId));
    await db.delete(user).where(eq(user.id, execBId));
  });

  it("lets an executive see and fetch only clients assigned to them", async () => {
    const clientForA = await createClient(
      input("9876500001", { assignedTo: execAId }),
      managerScope,
    );
    const clientForB = await createClient(
      input("9876500002", { assignedTo: execBId }),
      managerScope,
    );

    const aList = await listClients(execAScope);
    const bList = await listClients(execBScope);

    expect(aList.rows.map((c) => c.id)).toContain(clientForA.id);
    expect(aList.rows.map((c) => c.id)).not.toContain(clientForB.id);
    expect(bList.rows.map((c) => c.id)).toContain(clientForB.id);
    expect(bList.rows.map((c) => c.id)).not.toContain(clientForA.id);

    expect(await getClient(clientForB.id, execAScope)).toBeUndefined();
    expect(await getClient(clientForA.id, execAScope)).toBeTruthy();
  });

  it("does not scope managers — they see all clients", async () => {
    const clientForA = await createClient(
      input("9876500003", { assignedTo: execAId }),
      managerScope,
    );

    const managerList = await listClients(managerScope);
    expect(managerList.rows.map((c) => c.id)).toContain(clientForA.id);
  });

  it("filters by name or phone when a search term is given", async () => {
    const created = await createClient(
      input("9876500008", { name: "Unique Search Target" }),
      managerScope,
    );

    const byName = await listClients(managerScope, { search: "Unique Search Target" });
    expect(byName.rows.map((c) => c.id)).toContain(created.id);

    const byPhone = await listClients(managerScope, { search: "9876500008" });
    expect(byPhone.rows.map((c) => c.id)).toContain(created.id);

    const noMatch = await listClients(managerScope, { search: "no-such-client-xyz" });
    expect(noMatch.rows.map((c) => c.id)).not.toContain(created.id);
  });

  it("forces assignedTo to self when an executive creates a client, ignoring the submitted value", async () => {
    const created = await createClient(input("9876500004", { assignedTo: execBId }), execAScope);
    expect(created.assignedTo).toBe(execAId);
  });

  it("prevents an executive from updating a client not assigned to them", async () => {
    const clientForB = await createClient(
      input("9876500005", { assignedTo: execBId }),
      managerScope,
    );

    const result = await updateClient(
      clientForB.id,
      input("9876500005", { name: "Hacked Name" }),
      execAScope,
    );
    expect(result).toBeNull();

    const stillIntact = await getClient(clientForB.id, execBScope);
    expect(stillIntact?.name).toBe("Scoping Test Client");
  });

  it("lets an executive update a client assigned to them", async () => {
    const clientForA = await createClient(
      input("9876500006", { assignedTo: execAId }),
      managerScope,
    );

    const result = await updateClient(
      clientForA.id,
      input("9876500006", { name: "Updated Name", assignedTo: execAId }),
      execAScope,
    );
    expect(result?.name).toBe("Updated Name");
  });

  it("scopes listClientOptions to the executive's own assigned clients", async () => {
    const clientForA = await createClient(
      input("9876500009", { assignedTo: execAId }),
      managerScope,
    );
    const clientForB = await createClient(
      input("9876500010", { assignedTo: execBId }),
      managerScope,
    );

    const aOptions = await listClientOptions(execAScope);
    expect(aOptions.map((c) => c.id)).toContain(clientForA.id);
    expect(aOptions.map((c) => c.id)).not.toContain(clientForB.id);

    const managerOptions = await listClientOptions(managerScope);
    expect(managerOptions.map((c) => c.id)).toContain(clientForA.id);
    expect(managerOptions.map((c) => c.id)).toContain(clientForB.id);
  });

  it("soft-deletes a client so it no longer appears in scoped queries", async () => {
    const created = await createClient(input("9876500007"), managerScope);

    const deleted = await deleteClient(created.id, managerScope);
    expect(deleted?.deletedAt).toBeTruthy();

    expect(await getClient(created.id, managerScope)).toBeUndefined();
  });

  it("toggles whatsappOptedOut, scoped like every other mutation", async () => {
    const clientForA = await createClient(
      input("9876500011", { assignedTo: execAId }),
      managerScope,
    );
    expect(clientForA.whatsappOptedOut).toBe(false);

    const optedOut = await setWhatsAppOptOut(clientForA.id, true, execAScope);
    expect(optedOut?.whatsappOptedOut).toBe(true);

    const blocked = await setWhatsAppOptOut(clientForA.id, false, execBScope);
    expect(blocked).toBeNull();

    const optedBackIn = await setWhatsAppOptOut(clientForA.id, false, managerScope);
    expect(optedBackIn?.whatsappOptedOut).toBe(false);
  });

  it("getClientForNotification returns unscoped contact info for the notification jobs", async () => {
    const created = await createClient(
      input("9876500012", { name: "Notification Fetch Target", email: "notif@example.com" }),
      managerScope,
    );

    const contact = await getClientForNotification(created.id);
    expect(contact?.name).toBe("Notification Fetch Target");
    expect(contact?.phone).toBe("+919876500012");
    expect(contact?.email).toBe("notif@example.com");
    expect(contact?.whatsappOptedOut).toBe(false);

    expect(await getClientForNotification(randomUUID())).toBeUndefined();
  });
});
