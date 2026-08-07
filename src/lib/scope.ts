import { and, eq, inArray, type SQL, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { clients } from "@/db/schema/clients";
import type { employeeTypeEnum } from "@/db/schema/staff";
import type { Role } from "@/lib/auth";

export type EmployeeType = (typeof employeeTypeEnum.enumValues)[number];

/**
 * Identifies the acting user for service-layer authorization and row scoping (spec 3, extended
 * by ADR 0001 with employeeType/pincodes/serviceIds for franchise territories and service-scoped
 * panels). employeeType/pincodes/serviceIds default to unrestricted-internal when a user has no
 * staff_profiles row — see getStaffScope in services/staff.ts.
 */
export type ActorScope = {
  userId: string;
  role: Role;
  employeeType: EmployeeType;
  pincodes: string[];
  serviceIds: string[];
};

/** Internal-type executives only ever see/act on rows assigned to them (spec 3). */
export function assignedToCondition(
  assignedToColumn: AnyPgColumn,
  scope: ActorScope,
): SQL | undefined {
  if (scope.role !== "executive" || scope.employeeType !== "internal") return undefined;
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
  if (scope.pincodes.length === 0) return sql`false`;
  return inArray(pincodeColumn, scope.pincodes);
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
  if (scope.pincodes.length === 0) return sql`false`;
  return inArray(
    clientIdColumn,
    db.select({ id: clients.id }).from(clients).where(inArray(clients.pincode, scope.pincodes)),
  );
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
