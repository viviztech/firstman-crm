import type { StaffTeam } from "@/lib/scope";

/** Explicit membership; legacy unset teams are handled separately by module visibility. */
export function hasStaffTeam(team: StaffTeam | null | undefined, requiredTeam: StaffTeam): boolean {
  return (
    team === requiredTeam ||
    (team === "sales_operations" && (requiredTeam === "sales" || requiredTeam === "operations"))
  );
}

const STAFF_TEAM_LABELS: Record<StaffTeam, string> = {
  sales: "Sales",
  operations: "Operations",
  sales_operations: "Sales & Operations",
  backoffice: "Backoffice Admin",
  workforce: "Workforce Manager",
  franchise: "Franchise Manager",
};

export function getStaffTeamLabel(team: StaffTeam): string {
  return STAFF_TEAM_LABELS[team];
}
