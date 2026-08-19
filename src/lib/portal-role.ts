import type { Role } from "@/lib/roles";
import type { EmployeeType, StaffTeam } from "@/lib/scope";

export type PortalRole =
  | "Super Admin"
  | "Backoffice Admin"
  | "Sales"
  | "Operations"
  | "Accounts"
  | "Workforce Manager"
  | "Franchise"
  | "Associate Sales"
  | "Associate Operations";

export function getPortalRole(
  role: Role,
  team: StaffTeam | null,
  employeeType: EmployeeType,
): PortalRole {
  if (role === "super_admin") return "Super Admin";
  if (role === "accountant") return "Accounts";
  if (role === "manager" && team === "workforce") return "Workforce Manager";
  if (role === "manager") return "Backoffice Admin";
  if (employeeType === "franchise") return "Franchise";
  if (employeeType === "associate" && team === "sales") return "Associate Sales";
  if (employeeType === "associate" && team === "operations") return "Associate Operations";
  if (team === "operations") return "Operations";
  return "Sales";
}
