import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import {
  assemblyConstituencies,
  franchiseTerritories,
  parliamentaryConstituencies,
  pincodeConstituencies,
} from "@/db/schema/franchise";
import { pincodes, states } from "@/db/schema/geography";
import { makeScope } from "@/lib/test-scope";
import {
  calculateFranchiseCommission,
  getFranchiseNetworkOverview,
  getFranchiseTerritoryHierarchy,
} from "@/services/franchise-commissions";

describe("franchise commission rules", () => {
  it("stacks basic and additional commission when the franchise closes the sale", () => {
    expect(
      calculateFranchiseCommission({
        salePaise: 1_000_000,
        basicRateBps: 500,
        additionalRateBps: 1000,
        closedByFranchise: true,
        jobCompleted: false,
        paymentReceived: false,
      }),
    ).toEqual({
      basicCommissionPaise: 50_000,
      additionalCommissionPaise: 100_000,
      totalCommissionPaise: 150_000,
      status: "expected",
    });
  });

  it("does not add 10% when another franchise or staff member closes the sale", () => {
    const result = calculateFranchiseCommission({
      salePaise: 1_000_000,
      basicRateBps: 100,
      additionalRateBps: 1000,
      closedByFranchise: false,
      jobCompleted: true,
      paymentReceived: true,
    });
    expect(result.totalCommissionPaise).toBe(10_000);
    expect(result.status).toBe("earned");
  });

  it.each([
    [false, false],
    [true, false],
    [false, true],
  ])(
    "keeps commission expected until both completion and payment",
    (jobCompleted, paymentReceived) => {
      expect(
        calculateFranchiseCommission({
          salePaise: 100_000,
          basicRateBps: 500,
          additionalRateBps: 1000,
          closedByFranchise: true,
          jobCompleted,
          paymentReceived,
        }).status,
      ).toBe("expected");
    },
  );
});

describe("getFranchiseTerritoryHierarchy (integration)", () => {
  const suffix = randomUUID().slice(0, 8);
  const stateFranchiseId = randomUUID();
  const pcFranchiseId = randomUUID();
  const acFranchiseId = randomUUID();
  const areaFranchiseId = randomUUID();
  let karnatakaId: string;
  let pcId: string;
  let ac1Id: string;
  let ac2Id: string;
  let pincodeInAc1: string;
  const territoryIds: string[] = [];

  beforeAll(async () => {
    const karnataka = await db.query.states.findFirst({ where: eq(states.name, "Karnataka") });
    if (!karnataka) throw new Error("Seed geography first — Karnataka not found");
    karnatakaId = karnataka.id;

    const karnatakaPincode = await db.query.pincodes.findFirst({
      where: eq(pincodes.stateId, karnataka.id),
    });
    if (!karnatakaPincode) throw new Error("Seed geography first — need a Karnataka pincode");
    pincodeInAc1 = karnatakaPincode.pincode;

    await db.insert(user).values([
      {
        id: stateFranchiseId,
        name: "Hierarchy Test State Franchise",
        email: `hier-state-${suffix}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: pcFranchiseId,
        name: "Hierarchy Test PC Franchise",
        email: `hier-pc-${suffix}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: acFranchiseId,
        name: "Hierarchy Test AC Franchise",
        email: `hier-ac-${suffix}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: areaFranchiseId,
        name: "Hierarchy Test Area Franchise",
        email: `hier-area-${suffix}@test.local`,
        emailVerified: true,
        role: "executive",
      },
    ]);

    const [pc] = await db
      .insert(parliamentaryConstituencies)
      .values({ stateId: karnatakaId, code: `H-PC-${suffix}`, name: `Hierarchy Test PC ${suffix}` })
      .returning();
    if (!pc) throw new Error("Failed to create test parliamentary constituency");
    pcId = pc.id;

    const [ac1] = await db
      .insert(assemblyConstituencies)
      .values({
        stateId: karnatakaId,
        parliamentaryConstituencyId: pcId,
        code: `H-AC1-${suffix}`,
        name: `Hierarchy Test AC1 ${suffix}`,
      })
      .returning();
    const [ac2] = await db
      .insert(assemblyConstituencies)
      .values({
        stateId: karnatakaId,
        parliamentaryConstituencyId: pcId,
        code: `H-AC2-${suffix}`,
        name: `Hierarchy Test AC2 ${suffix}`,
      })
      .returning();
    if (!ac1 || !ac2) throw new Error("Failed to create test assembly constituencies");
    ac1Id = ac1.id;
    ac2Id = ac2.id;

    await db.insert(pincodeConstituencies).values({
      pincode: pincodeInAc1,
      assemblyConstituencyId: ac1Id,
    });

    const inserted = await db
      .insert(franchiseTerritories)
      .values([
        {
          userId: stateFranchiseId,
          level: "state",
          territoryKey: `state:${karnatakaId}`,
          stateId: karnatakaId,
          basicRateBps: 100,
        },
        {
          userId: pcFranchiseId,
          level: "parliamentary",
          territoryKey: `parliamentary:${pcId}`,
          stateId: karnatakaId,
          parliamentaryConstituencyId: pcId,
          basicRateBps: 500,
        },
        {
          userId: acFranchiseId,
          level: "assembly",
          territoryKey: `assembly:${ac1Id}`,
          stateId: karnatakaId,
          assemblyConstituencyId: ac1Id,
          basicRateBps: 500,
        },
        {
          userId: areaFranchiseId,
          level: "area",
          territoryKey: `area:${pincodeInAc1}`,
          stateId: karnatakaId,
          pincode: pincodeInAc1,
          basicRateBps: 500,
        },
      ])
      .returning({ id: franchiseTerritories.id });
    territoryIds.push(...inserted.map((row) => row.id));
  });

  afterAll(async () => {
    for (const id of territoryIds) {
      await db.delete(franchiseTerritories).where(eq(franchiseTerritories.id, id));
    }
    await db
      .delete(pincodeConstituencies)
      .where(eq(pincodeConstituencies.assemblyConstituencyId, ac1Id));
    await db.delete(assemblyConstituencies).where(eq(assemblyConstituencies.id, ac1Id));
    await db.delete(assemblyConstituencies).where(eq(assemblyConstituencies.id, ac2Id));
    await db.delete(parliamentaryConstituencies).where(eq(parliamentaryConstituencies.id, pcId));
    await db.delete(user).where(eq(user.id, stateFranchiseId));
    await db.delete(user).where(eq(user.id, pcFranchiseId));
    await db.delete(user).where(eq(user.id, acFranchiseId));
    await db.delete(user).where(eq(user.id, areaFranchiseId));
  });

  it("state level: lists parliamentary constituencies in the state, annotated with whichever franchise holds each", async () => {
    const scope = makeScope(stateFranchiseId, "executive", { employeeType: "franchise" });
    const result = await getFranchiseTerritoryHierarchy(scope);
    expect(result.level).toBe("state");
    expect(result.childLevel).toBe("parliamentary");

    const child = result.children.find((row) => row.id === pcId);
    expect(child).toBeTruthy();
    expect(child?.franchise?.userId).toBe(pcFranchiseId);
  });

  it("parliamentary level: lists assembly constituencies under that PC, distinguishing assigned from open", async () => {
    const scope = makeScope(pcFranchiseId, "executive", { employeeType: "franchise" });
    const result = await getFranchiseTerritoryHierarchy(scope);
    expect(result.level).toBe("parliamentary");
    expect(result.childLevel).toBe("assembly");

    const childIds = result.children.map((row) => row.id);
    expect(childIds).toContain(ac1Id);
    expect(childIds).toContain(ac2Id);

    const ac1Child = result.children.find((row) => row.id === ac1Id);
    const ac2Child = result.children.find((row) => row.id === ac2Id);
    expect(ac1Child?.franchise?.userId).toBe(acFranchiseId);
    expect(ac2Child?.franchise).toBeNull();
  });

  it("assembly level: lists pincodes mapped to that AC, annotated with whichever area-level franchise holds each", async () => {
    const scope = makeScope(acFranchiseId, "executive", { employeeType: "franchise" });
    const result = await getFranchiseTerritoryHierarchy(scope);
    expect(result.level).toBe("assembly");
    expect(result.childLevel).toBe("area");

    const child = result.children.find((row) => row.id === pincodeInAc1);
    expect(child).toBeTruthy();
    expect(child?.franchise?.userId).toBe(areaFranchiseId);
  });

  it("area level: is the leaf of the hierarchy — no child level, no children", async () => {
    const scope = makeScope(areaFranchiseId, "executive", { employeeType: "franchise" });
    const result = await getFranchiseTerritoryHierarchy(scope);
    expect(result.level).toBe("area");
    expect(result.childLevel).toBeNull();
    expect(result.children).toEqual([]);
    expect(result.parentLabel).toBe(pincodeInAc1);
  });

  it("returns an empty/null result for a franchise executive with no territory assigned yet", async () => {
    const scope = makeScope(randomUUID(), "executive", { employeeType: "franchise" });
    const result = await getFranchiseTerritoryHierarchy(scope);
    expect(result).toEqual({ level: null, parentLabel: null, childLevel: null, children: [] });
  });

  it("throws for a non-franchise scope", async () => {
    const scope = makeScope(randomUUID(), "executive", { employeeType: "internal" });
    await expect(getFranchiseTerritoryHierarchy(scope)).rejects.toThrow();
  });

  describe("getFranchiseNetworkOverview", () => {
    it("rolls up every active territory, including all four levels seeded above, for a manager", async () => {
      const scope = makeScope(randomUUID(), "manager");
      const result = await getFranchiseNetworkOverview(scope);

      const franchiseUserIds = result.rows.map((row) => row.franchiseUserId);
      expect(franchiseUserIds).toContain(stateFranchiseId);
      expect(franchiseUserIds).toContain(pcFranchiseId);
      expect(franchiseUserIds).toContain(acFranchiseId);
      expect(franchiseUserIds).toContain(areaFranchiseId);

      expect(result.franchiseCount).toBe(result.rows.length);
      expect(result.totalSalesPaise).toBe(
        result.rows.reduce((sum, row) => sum + row.salesPaise, 0),
      );
      expect(result.totalExpectedCommissionPaise).toBe(
        result.rows.reduce((sum, row) => sum + row.expectedCommissionPaise, 0),
      );
      expect(result.totalEarnedCommissionPaise).toBe(
        result.rows.reduce((sum, row) => sum + row.earnedCommissionPaise, 0),
      );

      const stateRow = result.rows.find((row) => row.franchiseUserId === stateFranchiseId);
      expect(stateRow?.level).toBe("state");
      expect(stateRow?.label).toBe("Karnataka");
    });

    it("is also available to super_admin, and throws for anyone else", async () => {
      const adminScope = makeScope(randomUUID(), "super_admin");
      await expect(getFranchiseNetworkOverview(adminScope)).resolves.toBeDefined();

      const execScope = makeScope(randomUUID(), "executive", { employeeType: "franchise" });
      await expect(getFranchiseNetworkOverview(execScope)).rejects.toThrow();

      const accountantScope = makeScope(randomUUID(), "accountant");
      await expect(getFranchiseNetworkOverview(accountantScope)).rejects.toThrow();
    });
  });
});
