import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookText,
  CalendarClock,
  FileText,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";
import type { Role } from "@/lib/auth";
import type { StaffTeam } from "@/lib/scope";

export type NavGroup = "Main" | "Operations" | "Finance" | "Admin";

export const NAV_GROUP_LABEL: Record<NavGroup, string> = {
  Main: "Main Menu",
  Operations: "Operations",
  Finance: "Finance",
  Admin: "Admin",
};

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
  group: NavGroup;
  /** Omitted = visible to every team (and to executives with no team set) — ADR 0002. */
  teams?: StaffTeam[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["super_admin", "manager", "executive", "accountant"],
    group: "Main",
  },
  {
    title: "Enquiries",
    href: "/enquiries",
    icon: UsersRound,
    roles: ["super_admin", "manager", "executive"],
    teams: ["sales"],
    group: "Operations",
  },
  {
    title: "Clients",
    href: "/clients",
    icon: Users,
    roles: ["super_admin", "manager", "executive", "accountant"],
    group: "Operations",
  },
  {
    title: "Catalog",
    href: "/catalog",
    icon: BookText,
    roles: ["super_admin", "manager", "executive"],
    group: "Operations",
  },
  {
    title: "Job Cards",
    href: "/orders",
    icon: FileText,
    roles: ["super_admin", "manager", "executive", "accountant"],
    teams: ["operations"],
    group: "Operations",
  },
  {
    title: "Compliance",
    href: "/compliance",
    icon: CalendarClock,
    roles: ["super_admin", "manager", "executive"],
    group: "Operations",
  },
  {
    title: "Invoices",
    href: "/invoices",
    icon: Receipt,
    roles: ["super_admin", "manager", "accountant"],
    group: "Finance",
  },
  {
    title: "Expenses",
    href: "/expenses",
    icon: Wallet,
    roles: ["super_admin", "manager", "accountant"],
    group: "Finance",
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["super_admin", "manager", "accountant"],
    group: "Finance",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["super_admin", "manager"],
    group: "Admin",
  },
];

/** Render order for grouped nav sections — groups with no visible items are skipped. */
export const NAV_GROUP_ORDER: NavGroup[] = ["Main", "Operations", "Finance", "Admin"];
