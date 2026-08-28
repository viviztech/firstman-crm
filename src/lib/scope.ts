import { and, eq, inArray, type SQL, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { clients } from "@/db/schema/clients";
import { assemblyConstituencies, pincodeConstituencies } from "@/db/schema/franchise";
import { pincodes } from "@/db/schema/geography";
import type { employeeTypeEnum, staffTeamEnum } from "@/db/schema/staff";
import type { Role } from "@/lib/auth";

export type EmployeeType = (typeof employeeTypeEnum.enumValues)[number];
export type StaffTeam = (typeof staffTeamEnum.enumValues)[number];
export type FranchiseTerritoryScope = {
  id: string;
  level: "state" | "parliamentary" | "assembly" | "area";
  stateId: string;
  parliamentaryConstituencyId: string | null;
  assemblyConstituencyId: string | null;
  pincode: string | null;
};

/**
 * Identifies the acting user for service-layer authorization and row scoping (spec 3, extended
 * by ADR 0001 with employeeType/pincodes/serviceIds for franchise territories and service-scoped
 * panels, and by ADR 0002 with team for the Sales/Operations split). employeeType/pincodes/
 * serviceIds default to unrestricted-internal, and team defaults to null (unrestricted), when a
 * user has no staff_profiles row — see getStaffScope in services/staff.ts.
 */
export type ActorScope = {
  userId: string;
  role: Role;
  employeeType: EmployeeType;
  pincodes: string[];
  serviceIds: string[];
  team: StaffTeam | null;
  franchiseTerritory?: FranchiseTerritoryScope | null;
};

export function isAssignedEmployee(scope: ActorScope): boolean {
  return scope.employeeType === "internal" || scope.employeeType === "associate";
}

/** Internal-type executives only ever see/act on rows assigned to them (spec 3). */
export function assignedToCondition(
  assignedToColumn: AnyPgColumn,
  scope: ActorScope,
): SQL | undefined {
  if (scope.role !== "executive" || !isAssignedEmployee(scope)) return undefined;
  return eq(assignedToColumn, scope.userId);
}

/**
 * Franchise-type executives see every record in their allocated pincode territory — a hard scope,
 * not limited to their own assignedTo rows (a franchise is a small team covering an area, ADR
 * 0001). Zero allocated pincodes fails closed: sees nothing, never "sees everything". Use this
 * when `pincodeColumn` belongs to the table being queried (or a table it's already joined to,
 * e.g. compliance.ts's clients join) — otherwise use `territoryConditionViaClientIds`.
 */
export function territoryCondition(pincodeColumn: AnyPgColumn, scope: ActorScope): SQL | undefined {
  if (scope.role !== "executive" || scope.employeeType !== "franchise") return undefined;
  const territory = scope.franchiseTerritory;
  if (territory) {
    if (territory.level === "state") {
      return inArray(
        pincodeColumn,
        db
          .select({ pincode: pincodes.pincode })
          .from(pincodes)
          .where(eq(pincodes.stateId, territory.stateId)),
      );
    }
    if (territory.level === "parliamentary" && territory.parliamentaryConstituencyId) {
      return inArray(
        pincodeColumn,
        db
          .select({ pincode: pincodeConstituencies.pincode })
          .from(pincodeConstituencies)
          .innerJoin(
            assemblyConstituencies,
            eq(pincodeConstituencies.assemblyConstituencyId, assemblyConstituencies.id),
          )
          .where(
            eq(
              assemblyConstituencies.parliamentaryConstituencyId,
              territory.parliamentaryConstituencyId,
            ),
          ),
      );
    }
    if (territory.level === "assembly" && territory.assemblyConstituencyId) {
      return inArray(
        pincodeColumn,
        db
          .select({ pincode: pincodeConstituencies.pincode })
          .from(pincodeConstituencies)
          .where(
            eq(pincodeConstituencies.assemblyConstituencyId, territory.assemblyConstituencyId),
          ),
      );
    }
    if (territory.level === "area" && territory.pincode)
      return eq(pincodeColumn, territory.pincode);
    return sql`false`;
  }
  if (scope.pincodes.length === 0) return sql`false`;
  return inArray(pincodeColumn, scope.pincodes);
}

/**
 * Point-check version of `territoryCondition` for call sites that already have a single pincode in
 * hand (ad hoc single-row authorization checks, e.g. "can this franchise touch this one document or
 * compliance item") rather than a column to filter a list query by. Mirrors each level's rule from
 * `territoryCondition` exactly, branch for branch, rather than re-deriving the check against
 * `scope.pincodes` (which is only ever populated for legacy flat allocations, so it silently denies
 * every state/parliamentary/assembly-level franchise regardless of their real territory).
 */
export async function isPincodeInFranchiseTerritory(
  pincode: string | null,
  scope: ActorScope,
): Promise<boolean> {
  if (scope.role !== "executive" || scope.employeeType !== "franchise") return true;
  if (!pincode) return false;

  const territory = scope.franchiseTerritory;
  if (!territory) return scope.pincodes.includes(pincode);

  if (territory.level === "area") return territory.pincode === pincode;

  if (territory.level === "state") {
    const row = await db.query.pincodes.findFirst({
      where: and(eq(pincodes.pincode, pincode), eq(pincodes.stateId, territory.stateId)),
      columns: { id: true },
    });
    return Boolean(row);
  }

  if (territory.level === "parliamentary" && territory.parliamentaryConstituencyId) {
    const rows = await db
      .select({ id: pincodeConstituencies.id })
      .from(pincodeConstituencies)
      .innerJoin(
        assemblyConstituencies,
        eq(pincodeConstituencies.assemblyConstituencyId, assemblyConstituencies.id),
      )
      .where(
        and(
          eq(pincodeConstituencies.pincode, pincode),
          eq(
            assemblyConstituencies.parliamentaryConstituencyId,
            territory.parliamentaryConstituencyId,
          ),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  if (territory.level === "assembly" && territory.assemblyConstituencyId) {
    const rows = await db
      .select({ id: pincodeConstituencies.id })
      .from(pincodeConstituencies)
      .where(
        and(
          eq(pincodeConstituencies.pincode, pincode),
          eq(pincodeConstituencies.assemblyConstituencyId, territory.assemblyConstituencyId),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  return false;
}

/**
 * Same franchise-territory rule as `territoryCondition`, for tables (orders, order tasks via a
 * further subquery, etc.) that only carry a clientId FK rather than their own pincode column —
 * resolves via a subquery against clients.pincode instead of requiring a join.
 */
export function territoryConditionViaClientIds(
  clientIdColumn: AnyPgColumn,
  scope: ActorScope,
): SQL | undefined {
  if (scope.role !== "executive" || scope.employeeType !== "franchise") return undefined;
  const pincodeScope = territoryCondition(clients.pincode, scope);
  if (!pincodeScope) return undefined;
  return inArray(clientIdColumn, db.select({ id: clients.id }).from(clients).where(pincodeScope));
}

/**
 * Staff assigned specific services (staff_service_assignments) only see records for those
 * services. No assignment rows at all means unrestricted — every executive without an explicit
 * assignment keeps seeing every service, matching pre-ADR-0001 behavior (ADR 0001).
 */
export function serviceCondition(serviceIdColumn: AnyPgColumn, scope: ActorScope): SQL | undefined {
  if (scope.role !== "executive" || scope.serviceIds.length === 0) return undefined;
  return inArray(serviceIdColumn, scope.serviceIds);
}

/**
 * Sales-team executives never see fulfillment work; operations-team executives never see the
 * sales pipeline (ADR 0002). Unlike assignedTo/territory/service scoping, this is an all-or-
 * nothing module boundary, not a row filter — so it's composed by each module's own
 * scopeCondition() rather than through visibilityConditions()'s per-column shape. No team set
 * (or a non-executive role) is unrestricted, same "absence = unrestricted" rule as elsewhere.
 */
export function teamCondition(scope: ActorScope, requiredTeam: StaffTeam): SQL | undefined {
  if (scope.role !== "executive" || !scope.team) return undefined;
  return scope.team === requiredTeam ? undefined : sql`false`;
}

type VisibilityColumns = {
  assignedToColumn?: AnyPgColumn;
  /** Table has its own pincode column, or is already joined to one (e.g. compliance's clients join). */
  pincodeColumn?: AnyPgColumn;
  /** Table only has a clientId FK — territory resolved via subquery against clients.pincode. */
  clientIdColumn?: AnyPgColumn;
  serviceIdColumn?: AnyPgColumn;
};

/**
 * Composes the assignedTo/territory/service conditions that apply for this actor, AND'd together.
 * Returns undefined for non-executive roles — manager/accountant/super_admin see everything,
 * unchanged from spec 3. Every list/get query in the service layer should route through this
 * instead of writing its own scoping condition (see ADR 0001 for why this was centralized).
 */
export function visibilityConditions(
  scope: ActorScope,
  columns: VisibilityColumns,
): SQL | undefined {
  if (scope.role !== "executive") return undefined;

  const conditions: SQL[] = [];

  if (scope.employeeType === "franchise") {
    const cond = columns.pincodeColumn
      ? territoryCondition(columns.pincodeColumn, scope)
      : columns.clientIdColumn
        ? territoryConditionViaClientIds(columns.clientIdColumn, scope)
        : undefined;
    if (cond) conditions.push(cond);
  } else if (columns.assignedToColumn) {
    const cond = assignedToCondition(columns.assignedToColumn, scope);
    if (cond) conditions.push(cond);
  }

  if (columns.serviceIdColumn) {
    const cond = serviceCondition(columns.serviceIdColumn, scope);
    if (cond) conditions.push(cond);
  }

  if (conditions.length === 0) return undefined;
  return and(...conditions);
}
