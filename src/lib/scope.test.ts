import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { clients } from "@/db/schema/clients";
import { enquiries } from "@/db/schema/enquiries";
import {
  assemblyConstituencies,
  parliamentaryConstituencies,
  pincodeConstituencies,
} from "@/db/schema/franchise";
import { pincodes, states } from "@/db/schema/geography";
import {
  assignedToCondition,
  isPincodeInFranchiseTerritory,
  serviceCondition,
  territoryCondition,
  visibilityConditions,
} from "@/lib/scope";
import { makeScope } from "@/lib/test-scope";

describe("assignedToCondition", () => {
  it("applies only to internal-type executives", () => {
    expect(assignedToCondition(enquiries.assignedTo, makeScope("u1", "executive"))).toBeDefined();
  });

  it("applies assigned-only scope to associate executives", () => {
    const scope = makeScope("u1", "executive", { employeeType: "associate" });
    expect(assignedToCondition(enquiries.assignedTo, scope)).toBeDefined();
  });

  it("does not apply to franchise-type executives", () => {
    const scope = makeScope("u1", "executive", { employeeType: "franchise" });
    expect(assignedToCondition(enquiries.assignedTo, scope)).toBeUndefined();
  });

  it("does not apply to non-executive roles", () => {
    expect(assignedToCondition(enquiries.assignedTo, makeScope("u1", "manager"))).toBeUndefined();
    expect(
      assignedToCondition(enquiries.assignedTo, makeScope("u1", "super_admin")),
    ).toBeUndefined();
    expect(
      assignedToCondition(enquiries.assignedTo, makeScope("u1", "accountant")),
    ).toBeUndefined();
  });
});

describe("territoryCondition", () => {
  it("applies only to franchise-type executives", () => {
    const scope = makeScope("u1", "executive", {
      employeeType: "franchise",
      pincodes: ["560001"],
    });
    expect(territoryCondition(clients.pincode, scope)).toBeDefined();
  });

  it("does not apply to internal-type executives", () => {
    const scope = makeScope("u1", "executive", { employeeType: "internal" });
    expect(territoryCondition(clients.pincode, scope)).toBeUndefined();
  });

  it("fails closed (still returns a condition) when a franchise has zero allocated pincodes", () => {
    const scope = makeScope("u1", "executive", { employeeType: "franchise", pincodes: [] });
    // Must return a condition (that matches nothing) rather than undefined (which would mean "unscoped").
    expect(territoryCondition(clients.pincode, scope)).toBeDefined();
  });

  it("is defined for every hierarchical franchise level", () => {
    const base = { id: "t1", stateId: "s1" } as const;
    for (const territory of [
      {
        ...base,
        level: "state" as const,
        parliamentaryConstituencyId: null,
        assemblyConstituencyId: null,
        pincode: null,
      },
      {
        ...base,
        level: "parliamentary" as const,
        parliamentaryConstituencyId: "pc1",
        assemblyConstituencyId: null,
        pincode: null,
      },
      {
        ...base,
        level: "assembly" as const,
        parliamentaryConstituencyId: null,
        assemblyConstituencyId: "ac1",
        pincode: null,
      },
      {
        ...base,
        level: "area" as const,
        parliamentaryConstituencyId: null,
        assemblyConstituencyId: null,
        pincode: "600001",
      },
    ]) {
      const scope = makeScope("u1", "executive", {
        employeeType: "franchise",
        franchiseTerritory: territory,
      });
      expect(territoryCondition(clients.pincode, scope)).toBeDefined();
    }
  });
});

describe("hierarchical franchise territory levels — end to end (integration)", () => {
  const suffix = randomUUID().slice(0, 8);
  const franchiseUserId = randomUUID();
  let karnatakaId: string;
  let pcId: string;
  let ac1Id: string;
  let ac2Id: string;
  let pincodeInAc1: string;
  let pincodeInAc2: string;
  let telanganaPincode: string;
  let clientInAc1Id: string;
  let clientInAc2Id: string;
  let clientInTelanganaId: string;

  beforeAll(async () => {
    const karnataka = await db.query.states.findFirst({ where: eq(states.name, "Karnataka") });
    const telangana = await db.query.states.findFirst({ where: eq(states.name, "Telangana") });
    if (!karnataka || !telangana) {
      throw new Error("Seed geography first — Karnataka/Telangana not found");
    }
    karnatakaId = karnataka.id;

    const karnatakaPincodes = await db.query.pincodes.findMany({
      where: eq(pincodes.stateId, karnataka.id),
      limit: 2,
    });
    const telanganaPincodeRow = await db.query.pincodes.findFirst({
      where: eq(pincodes.stateId, telangana.id),
    });
    const [karnatakaPincodeA, karnatakaPincodeB] = karnatakaPincodes;
    if (!karnatakaPincodeA || !karnatakaPincodeB || !telanganaPincodeRow) {
      throw new Error("Seed geography first — need 2 Karnataka pincodes and 1 Telangana pincode");
    }
    pincodeInAc1 = karnatakaPincodeA.pincode;
    pincodeInAc2 = karnatakaPincodeB.pincode;
    telanganaPincode = telanganaPincodeRow.pincode;

    const [pc] = await db
      .insert(parliamentaryConstituencies)
      .values({ stateId: karnatakaId, code: `T-PC-${suffix}`, name: `Test PC ${suffix}` })
      .returning();
    if (!pc) throw new Error("Failed to create test parliamentary constituency");
    pcId = pc.id;

    const [ac1] = await db
      .insert(assemblyConstituencies)
      .values({
        stateId: karnatakaId,
        parliamentaryConstituencyId: pcId,
        code: `T-AC1-${suffix}`,
        name: `Test AC1 ${suffix}`,
      })
      .returning();
    const [ac2] = await db
      .insert(assemblyConstituencies)
      .values({
        stateId: karnatakaId,
        parliamentaryConstituencyId: pcId,
        code: `T-AC2-${suffix}`,
        name: `Test AC2 ${suffix}`,
      })
      .returning();
    if (!ac1 || !ac2) throw new Error("Failed to create test assembly constituencies");
    ac1Id = ac1.id;
    ac2Id = ac2.id;

    await db.insert(pincodeConstituencies).values([
      { pincode: pincodeInAc1, assemblyConstituencyId: ac1Id },
      { pincode: pincodeInAc2, assemblyConstituencyId: ac2Id },
    ]);

    await db.insert(user).values({
      id: franchiseUserId,
      name: `Test Franchise ${suffix}`,
      email: `franchise-${suffix}@test.local`,
      emailVerified: true,
      role: "executive",
    });

    const [clientInAc1, clientInAc2, clientInTelangana] = await db
      .insert(clients)
      .values([
        {
          name: `Scope Test AC1 ${suffix}`,
          phone: `+91900000${suffix.slice(0, 4)}1`,
          pincode: pincodeInAc1,
        },
        {
          name: `Scope Test AC2 ${suffix}`,
          phone: `+91900000${suffix.slice(0, 4)}2`,
          pincode: pincodeInAc2,
        },
        {
          name: `Scope Test TG ${suffix}`,
          phone: `+91900000${suffix.slice(0, 4)}3`,
          pincode: telanganaPincode,
        },
      ])
      .returning();
    if (!clientInAc1 || !clientInAc2 || !clientInTelangana) {
      throw new Error("Failed to create test clients");
    }
    clientInAc1Id = clientInAc1.id;
    clientInAc2Id = clientInAc2.id;
    clientInTelanganaId = clientInTelangana.id;
  });

  afterAll(async () => {
    await db.delete(clients).where(eq(clients.id, clientInAc1Id));
    await db.delete(clients).where(eq(clients.id, clientInAc2Id));
    await db.delete(clients).where(eq(clients.id, clientInTelanganaId));
    await db.delete(user).where(eq(user.id, franchiseUserId));
    await db
      .delete(pincodeConstituencies)
      .where(eq(pincodeConstituencies.assemblyConstituencyId, ac1Id));
    await db
      .delete(pincodeConstituencies)
      .where(eq(pincodeConstituencies.assemblyConstituencyId, ac2Id));
    await db.delete(assemblyConstituencies).where(eq(assemblyConstituencies.id, ac1Id));
    await db.delete(assemblyConstituencies).where(eq(assemblyConstituencies.id, ac2Id));
    await db.delete(parliamentaryConstituencies).where(eq(parliamentaryConstituencies.id, pcId));
  });

  describe("territoryCondition executed against real rows", () => {
    it("state level matches every client in the state, across assemblies", async () => {
      const scope = makeScope(franchiseUserId, "executive", {
        employeeType: "franchise",
        franchiseTerritory: {
          id: "t",
          level: "state",
          stateId: karnatakaId,
          parliamentaryConstituencyId: null,
          assemblyConstituencyId: null,
          pincode: null,
        },
      });
      const condition = territoryCondition(clients.pincode, scope);
      const rows = await db.select({ id: clients.id }).from(clients).where(condition);
      const ids = rows.map((row) => row.id);
      expect(ids).toContain(clientInAc1Id);
      expect(ids).toContain(clientInAc2Id);
      expect(ids).not.toContain(clientInTelanganaId);
    });

    it("parliamentary level matches every client under any assembly of that PC", async () => {
      const scope = makeScope(franchiseUserId, "executive", {
        employeeType: "franchise",
        franchiseTerritory: {
          id: "t",
          level: "parliamentary",
          stateId: karnatakaId,
          parliamentaryConstituencyId: pcId,
          assemblyConstituencyId: null,
          pincode: null,
        },
      });
      const condition = territoryCondition(clients.pincode, scope);
      const rows = await db.select({ id: clients.id }).from(clients).where(condition);
      const ids = rows.map((row) => row.id);
      expect(ids).toContain(clientInAc1Id);
      expect(ids).toContain(clientInAc2Id);
      expect(ids).not.toContain(clientInTelanganaId);
    });

    it("assembly level matches only its own assembly's clients", async () => {
      const scope = makeScope(franchiseUserId, "executive", {
        employeeType: "franchise",
        franchiseTerritory: {
          id: "t",
          level: "assembly",
          stateId: karnatakaId,
          parliamentaryConstituencyId: null,
          assemblyConstituencyId: ac1Id,
          pincode: null,
        },
      });
      const condition = territoryCondition(clients.pincode, scope);
      const rows = await db.select({ id: clients.id }).from(clients).where(condition);
      const ids = rows.map((row) => row.id);
      expect(ids).toContain(clientInAc1Id);
      expect(ids).not.toContain(clientInAc2Id);
      expect(ids).not.toContain(clientInTelanganaId);
    });

    it("area level matches only that exact pincode", async () => {
      const scope = makeScope(franchiseUserId, "executive", {
        employeeType: "franchise",
        franchiseTerritory: {
          id: "t",
          level: "area",
          stateId: karnatakaId,
          parliamentaryConstituencyId: null,
          assemblyConstituencyId: null,
          pincode: pincodeInAc1,
        },
      });
      const condition = territoryCondition(clients.pincode, scope);
      const rows = await db.select({ id: clients.id }).from(clients).where(condition);
      const ids = rows.map((row) => row.id);
      expect(ids).toContain(clientInAc1Id);
      expect(ids).not.toContain(clientInAc2Id);
    });
  });

  describe("isPincodeInFranchiseTerritory", () => {
    it("state level: true anywhere in the state, false outside it", async () => {
      const scope = makeScope(franchiseUserId, "executive", {
        employeeType: "franchise",
        franchiseTerritory: {
          id: "t",
          level: "state",
          stateId: karnatakaId,
          parliamentaryConstituencyId: null,
          assemblyConstituencyId: null,
          pincode: null,
        },
      });
      expect(await isPincodeInFranchiseTerritory(pincodeInAc1, scope)).toBe(true);
      expect(await isPincodeInFranchiseTerritory(pincodeInAc2, scope)).toBe(true);
      expect(await isPincodeInFranchiseTerritory(telanganaPincode, scope)).toBe(false);
    });

    it("parliamentary level: true under any assembly of that PC, false outside it", async () => {
      const scope = makeScope(franchiseUserId, "executive", {
        employeeType: "franchise",
        franchiseTerritory: {
          id: "t",
          level: "parliamentary",
          stateId: karnatakaId,
          parliamentaryConstituencyId: pcId,
          assemblyConstituencyId: null,
          pincode: null,
        },
      });
      expect(await isPincodeInFranchiseTerritory(pincodeInAc1, scope)).toBe(true);
      expect(await isPincodeInFranchiseTerritory(pincodeInAc2, scope)).toBe(true);
      expect(await isPincodeInFranchiseTerritory(telanganaPincode, scope)).toBe(false);
    });

    it("assembly level: true only for its own assembly's pincode", async () => {
      const scope = makeScope(franchiseUserId, "executive", {
        employeeType: "franchise",
        franchiseTerritory: {
          id: "t",
          level: "assembly",
          stateId: karnatakaId,
          parliamentaryConstituencyId: null,
          assemblyConstituencyId: ac1Id,
          pincode: null,
        },
      });
      expect(await isPincodeInFranchiseTerritory(pincodeInAc1, scope)).toBe(true);
      expect(await isPincodeInFranchiseTerritory(pincodeInAc2, scope)).toBe(false);
    });

    it("area level: true only for the exact pincode", async () => {
      const scope = makeScope(franchiseUserId, "executive", {
        employeeType: "franchise",
        franchiseTerritory: {
          id: "t",
          level: "area",
          stateId: karnatakaId,
          parliamentaryConstituencyId: null,
          assemblyConstituencyId: null,
          pincode: pincodeInAc1,
        },
      });
      expect(await isPincodeInFranchiseTerritory(pincodeInAc1, scope)).toBe(true);
      expect(await isPincodeInFranchiseTerritory(pincodeInAc2, scope)).toBe(false);
    });

    it("falls back to legacy flat pincodes when no franchiseTerritory is set (regression: this is the bug documents.ts/compliance.ts used to have for every other level)", async () => {
      const scope = makeScope(franchiseUserId, "executive", {
        employeeType: "franchise",
        pincodes: [pincodeInAc1],
      });
      expect(await isPincodeInFranchiseTerritory(pincodeInAc1, scope)).toBe(true);
      expect(await isPincodeInFranchiseTerritory(pincodeInAc2, scope)).toBe(false);
    });

    it("returns false for a null pincode and true (not applicable) for non-franchise scopes", async () => {
      const franchiseScope = makeScope(franchiseUserId, "executive", { employeeType: "franchise" });
      expect(await isPincodeInFranchiseTerritory(null, franchiseScope)).toBe(false);

      const internalScope = makeScope(franchiseUserId, "executive", { employeeType: "internal" });
      expect(await isPincodeInFranchiseTerritory(pincodeInAc1, internalScope)).toBe(true);
    });
  });
});

describe("serviceCondition", () => {
  it("applies when the executive has explicit service assignments", () => {
    const scope = makeScope("u1", "executive", { serviceIds: ["s1", "s2"] });
    expect(serviceCondition(enquiries.serviceInterestedId, scope)).toBeDefined();
  });

  it("is unrestricted (undefined) when no service assignments are configured", () => {
    const scope = makeScope("u1", "executive", { serviceIds: [] });
    expect(serviceCondition(enquiries.serviceInterestedId, scope)).toBeUndefined();
  });

  it("does not apply to non-executive roles even with service assignments set", () => {
    const scope = makeScope("u1", "manager", { serviceIds: ["s1"] });
    expect(serviceCondition(enquiries.serviceInterestedId, scope)).toBeUndefined();
  });
});

describe("visibilityConditions", () => {
  it("returns undefined (unscoped) for manager/admin/accountant regardless of columns provided", () => {
    for (const role of ["manager", "super_admin", "accountant"] as const) {
      const scope = makeScope("u1", role, { pincodes: ["560001"], serviceIds: ["s1"] });
      expect(
        visibilityConditions(scope, {
          assignedToColumn: enquiries.assignedTo,
          pincodeColumn: enquiries.pincode,
          serviceIdColumn: enquiries.serviceInterestedId,
        }),
      ).toBeUndefined();
    }
  });

  it("scopes an internal executive by assignedTo only, ignoring pincode", () => {
    const scope = makeScope("u1", "executive", { employeeType: "internal" });
    const condition = visibilityConditions(scope, {
      assignedToColumn: enquiries.assignedTo,
      pincodeColumn: enquiries.pincode,
    });
    expect(condition).toBeDefined();
  });

  it("scopes a franchise executive by territory, ignoring assignedTo", () => {
    const scope = makeScope("u1", "executive", {
      employeeType: "franchise",
      pincodes: ["560001"],
    });
    const condition = visibilityConditions(scope, {
      assignedToColumn: enquiries.assignedTo,
      pincodeColumn: enquiries.pincode,
    });
    expect(condition).toBeDefined();
  });

  it("falls back to a via-client-id subquery when no direct pincode column is given", () => {
    const scope = makeScope("u1", "executive", {
      employeeType: "franchise",
      pincodes: ["560001"],
    });
    const condition = visibilityConditions(scope, { clientIdColumn: user.id });
    expect(condition).toBeDefined();
  });

  it("combines territory and service scoping for a franchise executive with service assignments", () => {
    const scope = makeScope("u1", "executive", {
      employeeType: "franchise",
      pincodes: ["560001"],
      serviceIds: ["s1"],
    });
    const condition = visibilityConditions(scope, {
      pincodeColumn: enquiries.pincode,
      serviceIdColumn: enquiries.serviceInterestedId,
    });
    expect(condition).toBeDefined();
  });

  it("returns undefined when an executive scope has no applicable columns and no service assignments", () => {
    const scope = makeScope("u1", "executive", { employeeType: "internal" });
    expect(visibilityConditions(scope, {})).toBeUndefined();
  });
});
