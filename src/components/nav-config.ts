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

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["super_admin", "manager", "executive", "accountant"],
  },
  {
    title: "Enquiries",
    href: "/enquiries",
    icon: UsersRound,
    roles: ["super_admin", "manager", "executive"],
  },
  {
    title: "Clients",
    href: "/clients",
    icon: Users,
    roles: ["super_admin", "manager", "executive", "accountant"],
  },
  {
    title: "Catalog",
    href: "/catalog",
    icon: BookText,
    roles: ["super_admin", "manager", "executive"],
  },
  {
    title: "Orders",
    href: "/orders",
    icon: FileText,
    roles: ["super_admin", "manager", "executive", "accountant"],
  },
  {
    title: "Compliance",
    href: "/compliance",
    icon: CalendarClock,
    roles: ["super_admin", "manager", "executive"],
  },
  {
    title: "Invoices",
    href: "/invoices",
    icon: Receipt,
    roles: ["super_admin", "manager", "accountant"],
  },
  {
    title: "Expenses",
    href: "/expenses",
    icon: Wallet,
    roles: ["super_admin", "manager", "accountant"],
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["super_admin", "manager", "accountant"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["super_admin", "manager"],
  },
];
