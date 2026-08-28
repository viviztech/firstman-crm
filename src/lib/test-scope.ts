import type { ActorScope, EmployeeType, FranchiseTerritoryScope, StaffTeam } from "@/lib/scope";

/**
 * Builds an ActorScope for tests without every call site having to spell out the
 * employeeType/pincodes/serviceIds/team defaults (ADR 0001, ADR 0002) — mirrors the "no
 * staff_profiles row" behavior of getStaffScope in services/staff.ts. `franchiseTerritory`
 * defaults to null (legacy flat-pincode franchise), matching getStaffScope's own default when a
 * franchise executive has no franchise_territories row yet.
 */
export function makeScope(
  userId: string,
  role: ActorScope["role"],
  overrides: Partial<{
    employeeType: EmployeeType;
    pincodes: string[];
    serviceIds: string[];
    team: StaffTeam | null;
    franchiseTerritory: FranchiseTerritoryScope | null;
  }> = {},
): ActorScope {
  return {
    userId,
    role,
    employeeType: overrides.employeeType ?? "internal",
    pincodes: overrides.pincodes ?? [],
    serviceIds: overrides.serviceIds ?? [],
    team: overrides.team ?? null,
    franchiseTerritory: overrides.franchiseTerritory ?? null,
  };
}
