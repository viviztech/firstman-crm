import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { clients } from "@/db/schema/clients";
import {
  assemblyConstituencies,
  type franchiseLevelEnum,
  franchiseTerritories,
  parliamentaryConstituencies,
  pincodeConstituencies,
} from "@/db/schema/franchise";
import { pincodes } from "@/db/schema/geography";
import { invoices } from "@/db/schema/invoices";
import { orders } from "@/db/schema/orders";
import type { ActorScope } from "@/lib/scope";
import { territoryCondition } from "@/lib/scope";

type FranchiseLevel = (typeof franchiseLevelEnum.enumValues)[number];

export const commissionPaise = (salePaise: number, rateBps: number) =>
  Math.round((salePaise * rateBps) / 10_000);

export function calculateFranchiseCommission(input: {
  salePaise: number;
  basicRateBps: number;
  additionalRateBps: number;
  closedByFranchise: boolean;
  jobCompleted: boolean;
  paymentReceived: boolean;
}) {
  const basicCommissionPaise = commissionPaise(input.salePaise, input.basicRateBps);
  const additionalCommissionPaise = input.closedByFranchise
    ? commissionPaise(input.salePaise, input.additionalRateBps)
    : 0;
  return {
    basicCommissionPaise,
    additionalCommissionPaise,
    totalCommissionPaise: basicCommissionPaise + additionalCommissionPaise,
    status:
      input.jobCompleted && input.paymentReceived ? ("earned" as const) : ("expected" as const),
  };
}

type TerritoryRow = {
  id: string;
  level: FranchiseLevel;
  stateId: string;
  parliamentaryConstituencyId: string | null;
  assemblyConstituencyId: string | null;
  pincode: string | null;
  basicRateBps: number;
  additionalRateBps: number;
};

function territoryLabel(
  territory: TerritoryRow & {
    state: { name: string };
    parliamentaryConstituency: { name: string } | null;
    assemblyConstituency: { name: string } | null;
    territoryKey: string;
  },
): string {
  if (territory.level === "state") return territory.state.name;
  if (territory.level === "parliamentary")
    return territory.parliamentaryConstituency?.name ?? territory.territoryKey;
  if (territory.level === "assembly")
    return territory.assemblyConstituency?.name ?? territory.territoryKey;
  return territory.pincode ?? territory.territoryKey;
}

/**
 * A single territory's commissionable jobs, joined and calculated once so
 * `getFranchiseCommissionDashboard` (one franchise's own detail view) and
 * `getFranchiseNetworkOverview` (every franchise, rolled up for managers) can't drift apart on
 * what counts as a sale or how commission is calculated.
 */
async function computeTerritoryRows(territory: TerritoryRow, franchiseUserId: string) {
  const pincodeCondition = territoryCondition(clients.pincode, {
    userId: franchiseUserId,
    role: "executive",
    employeeType: "franchise",
    pincodes: [],
    serviceIds: [],
    team: null,
    franchiseTerritory: {
      id: territory.id,
      level: territory.level,
      stateId: territory.stateId,
      parliamentaryConstituencyId: territory.parliamentaryConstituencyId,
      assemblyConstituencyId: territory.assemblyConstituencyId,
      pincode: territory.pincode,
    },
  });
  if (!pincodeCondition) throw new Error("Franchise territory is not configured correctly.");

  const sales = await db
    .select({
      orderId: orders.id,
      orderNo: orders.orderNo,
      customerName: clients.name,
      pincode: clients.pincode,
      salePaise: orders.quotedPricePaise,
      soldAt: orders.createdAt,
      orderStatus: orders.status,
      soldByUserId: orders.createdBy,
      paymentStatus: invoices.status,
    })
    .from(orders)
    .innerJoin(clients, eq(orders.clientId, clients.id))
    .innerJoin(
      invoices,
      and(
        eq(invoices.orderId, orders.id),
        eq(invoices.kind, "proforma"),
        isNull(invoices.deletedAt),
      ),
    )
    .where(and(isNull(orders.deletedAt), pincodeCondition));

  return sales
    .map((sale) => {
      const additionalEligible = sale.soldByUserId === franchiseUserId;
      const commission = calculateFranchiseCommission({
        salePaise: sale.salePaise,
        basicRateBps: territory.basicRateBps,
        additionalRateBps: territory.additionalRateBps,
        closedByFranchise: additionalEligible,
        jobCompleted: sale.orderStatus === "completed",
        paymentReceived: sale.paymentStatus === "paid",
      });
      return {
        ...sale,
        additionalEligible,
        ...commission,
        commissionStatus: commission.status,
      };
    })
    .sort((a, b) => b.soldAt.getTime() - a.soldAt.getTime());
}

export async function getFranchiseCommissionDashboard(scope: ActorScope) {
  if (scope.role !== "executive" || scope.employeeType !== "franchise") {
    throw new Error("Franchise commission data is only available to franchise users.");
  }
  const territory = await db.query.franchiseTerritories.findFirst({
    where: and(
      eq(franchiseTerritories.userId, scope.userId),
      eq(franchiseTerritories.active, true),
      isNull(franchiseTerritories.deletedAt),
    ),
    with: { state: true, parliamentaryConstituency: true, assemblyConstituency: true },
  });
  if (!territory)
    return {
      territory: null,
      basicRateBps: null,
      additionalRateBps: null,
      territorySalesCount: 0,
      territorySalesPaise: 0,
      expectedCommissionPaise: 0,
      earnedCommissionPaise: 0,
      rows: [],
    };

  const rows = await computeTerritoryRows(territory, scope.userId);

  return {
    territory: { id: territory.id, level: territory.level, label: territoryLabel(territory) },
    basicRateBps: territory.basicRateBps,
    additionalRateBps: territory.additionalRateBps,
    territorySalesCount: rows.length,
    territorySalesPaise: rows.reduce((sum, row) => sum + row.salePaise, 0),
    expectedCommissionPaise: rows
      .filter((row) => row.commissionStatus === "expected")
      .reduce((sum, row) => sum + row.totalCommissionPaise, 0),
    earnedCommissionPaise: rows
      .filter((row) => row.commissionStatus === "earned")
      .reduce((sum, row) => sum + row.totalCommissionPaise, 0),
    rows,
  };
}

export type FranchiseNetworkRow = {
  territoryId: string;
  franchiseUserId: string;
  franchiseName: string;
  level: FranchiseLevel;
  label: string;
  basicRateBps: number;
  additionalRateBps: number;
  salesCount: number;
  salesPaise: number;
  expectedCommissionPaise: number;
  earnedCommissionPaise: number;
};

export type FranchiseNetworkOverview = {
  franchiseCount: number;
  totalSalesPaise: number;
  totalExpectedCommissionPaise: number;
  totalEarnedCommissionPaise: number;
  rows: FranchiseNetworkRow[];
};

/**
 * Every active franchise, rolled up in one view for whoever oversees the network (manager/
 * super_admin — see the Franchise Manager workspace, ADR 0008). Each row reuses the exact same
 * territory-matching and commission math as a franchise's own dashboard, just run once per
 * territory instead of once for the caller's own — so the numbers a franchise sees for themself
 * always reconcile with what the network overview reports for them.
 */
export async function getFranchiseNetworkOverview(
  scope: ActorScope,
): Promise<FranchiseNetworkOverview> {
  if (scope.role !== "manager" && scope.role !== "super_admin") {
    throw new Error("The franchise network overview is only available to managers and admins.");
  }

  const territories = await db.query.franchiseTerritories.findMany({
    where: and(eq(franchiseTerritories.active, true), isNull(franchiseTerritories.deletedAt)),
    with: {
      user: { columns: { id: true, name: true } },
      state: true,
      parliamentaryConstituency: true,
      assemblyConstituency: true,
    },
    orderBy: (row, { asc }) => [asc(row.level), asc(row.territoryKey)],
  });

  const rows = await Promise.all(
    territories.map(async (territory): Promise<FranchiseNetworkRow> => {
      const territoryRows = await computeTerritoryRows(territory, territory.userId);
      return {
        territoryId: territory.id,
        franchiseUserId: territory.userId,
        franchiseName: territory.user.name,
        level: territory.level,
        label: territoryLabel(territory),
        basicRateBps: territory.basicRateBps,
        additionalRateBps: territory.additionalRateBps,
        salesCount: territoryRows.length,
        salesPaise: territoryRows.reduce((sum, row) => sum + row.salePaise, 0),
        expectedCommissionPaise: territoryRows
          .filter((row) => row.commissionStatus === "expected")
          .reduce((sum, row) => sum + row.totalCommissionPaise, 0),
        earnedCommissionPaise: territoryRows
          .filter((row) => row.commissionStatus === "earned")
          .reduce((sum, row) => sum + row.totalCommissionPaise, 0),
      };
    }),
  );

  return {
    franchiseCount: rows.length,
    totalSalesPaise: rows.reduce((sum, row) => sum + row.salesPaise, 0),
    totalExpectedCommissionPaise: rows.reduce((sum, row) => sum + row.expectedCommissionPaise, 0),
    totalEarnedCommissionPaise: rows.reduce((sum, row) => sum + row.earnedCommissionPaise, 0),
    rows,
  };
}

export type FranchiseHierarchyChild = {
  id: string;
  code: string | null;
  label: string;
  franchise: { userId: string; name: string } | null;
};

export type FranchiseHierarchyResult = {
  level: FranchiseLevel | null;
  parentLabel: string | null;
  childLevel: "parliamentary" | "assembly" | "area" | null;
  children: FranchiseHierarchyChild[];
};

/**
 * A franchise's own sub-territory tree, one level down from wherever they sit (spec: mandatory
 * per-level drill-down) — state sees its parliamentary constituencies, parliamentary sees its
 * assembly constituencies, assembly sees its mapped pincodes; area is the leaf, nothing below it.
 * Each child is annotated with whichever franchise (if any) already holds it, so a state/PC-level
 * franchise can see at a glance which of their sub-territories are still open to be franchised out.
 */
export async function getFranchiseTerritoryHierarchy(
  scope: ActorScope,
): Promise<FranchiseHierarchyResult> {
  if (scope.role !== "executive" || scope.employeeType !== "franchise") {
    throw new Error("Franchise hierarchy is only available to franchise users.");
  }
  const territory = await db.query.franchiseTerritories.findFirst({
    where: and(
      eq(franchiseTerritories.userId, scope.userId),
      eq(franchiseTerritories.active, true),
      isNull(franchiseTerritories.deletedAt),
    ),
    with: { state: true, parliamentaryConstituency: true, assemblyConstituency: true },
  });
  if (!territory) return { level: null, parentLabel: null, childLevel: null, children: [] };

  // Keyed the same way territoryKey is built (see franchise-territories.ts) so each child can be
  // looked up by its own would-be key without a per-child query.
  const assignments = await db
    .select({ territoryKey: franchiseTerritories.territoryKey, userId: user.id, name: user.name })
    .from(franchiseTerritories)
    .innerJoin(user, eq(franchiseTerritories.userId, user.id))
    .where(and(eq(franchiseTerritories.active, true), isNull(franchiseTerritories.deletedAt)));
  const assignmentByKey = new Map(assignments.map((row) => [row.territoryKey, row]));
  const franchiseFor = (territoryKey: string) => {
    const assignment = assignmentByKey.get(territoryKey);
    return assignment ? { userId: assignment.userId, name: assignment.name } : null;
  };

  if (territory.level === "state") {
    const pcs = await db
      .select()
      .from(parliamentaryConstituencies)
      .where(
        and(
          eq(parliamentaryConstituencies.stateId, territory.stateId),
          isNull(parliamentaryConstituencies.deletedAt),
        ),
      )
      .orderBy(parliamentaryConstituencies.code);
    return {
      level: "state",
      parentLabel: territory.state.name,
      childLevel: "parliamentary",
      children: pcs.map((pc) => ({
        id: pc.id,
        code: pc.code,
        label: pc.name,
        franchise: franchiseFor(`parliamentary:${pc.id}`),
      })),
    };
  }

  if (territory.level === "parliamentary" && territory.parliamentaryConstituencyId) {
    const acs = await db
      .select()
      .from(assemblyConstituencies)
      .where(
        and(
          eq(
            assemblyConstituencies.parliamentaryConstituencyId,
            territory.parliamentaryConstituencyId,
          ),
          isNull(assemblyConstituencies.deletedAt),
        ),
      )
      .orderBy(assemblyConstituencies.code);
    return {
      level: "parliamentary",
      parentLabel: territory.parliamentaryConstituency?.name ?? territory.territoryKey,
      childLevel: "assembly",
      children: acs.map((ac) => ({
        id: ac.id,
        code: ac.code,
        label: ac.name,
        franchise: franchiseFor(`assembly:${ac.id}`),
      })),
    };
  }

  if (territory.level === "assembly" && territory.assemblyConstituencyId) {
    const mappings = await db
      .select({ pincode: pincodeConstituencies.pincode, city: pincodes.city })
      .from(pincodeConstituencies)
      .leftJoin(pincodes, eq(pincodes.pincode, pincodeConstituencies.pincode))
      .where(
        and(
          eq(pincodeConstituencies.assemblyConstituencyId, territory.assemblyConstituencyId),
          isNull(pincodeConstituencies.deletedAt),
        ),
      )
      .orderBy(pincodeConstituencies.pincode);
    return {
      level: "assembly",
      parentLabel: territory.assemblyConstituency?.name ?? territory.territoryKey,
      childLevel: "area",
      children: mappings.map((row) => ({
        id: row.pincode,
        code: row.pincode,
        label: row.city ? `${row.pincode} — ${row.city}` : row.pincode,
        franchise: franchiseFor(`area:${row.pincode}`),
      })),
    };
  }

  // Area is the leaf of the hierarchy — nothing below a single pincode to drill into.
  return {
    level: "area",
    parentLabel: territory.pincode ?? territory.territoryKey,
    childLevel: null,
    children: [],
  };
}
