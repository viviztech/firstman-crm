import type { ActorScope, EmployeeType } from "@/lib/scope";

/**
 * Builds an ActorScope for tests without every call site having to spell out the
 * employeeType/pincodes/serviceIds defaults (ADR 0001) — mirrors the "no staff_profiles row"
 * behavior of getStaffScope in services/staff.ts.
 */
export function makeScope(
  userId: string,
  role: ActorScope["role"],
  overrides: Partial<{ employeeType: EmployeeType; pincodes: string[]; serviceIds: string[] }> = {},
): ActorScope {
  return {
    userId,
    role,
    employeeType: overrides.employeeType ?? "internal",
    pincodes: overrides.pincodes ?? [],
    serviceIds: overrides.serviceIds ?? [],
  };
}
