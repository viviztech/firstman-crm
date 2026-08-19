"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUP_LABEL, NAV_GROUP_ORDER, NAV_ITEMS } from "@/components/nav-config";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { Role } from "@/lib/auth";
import type { StaffTeam } from "@/lib/scope";

export function AppSidebar({ role, team }: { role: Role; team: StaffTeam | null }) {
  const pathname = usePathname();
  // A team restriction only applies to executives; every other role, and an executive with no
  // team set, sees the item regardless (ADR 0002 — "no team set" is unrestricted, not hidden).
  const items = NAV_ITEMS.filter(
    (item) =>
      item.roles.includes(role) &&
      (!item.teams || role !== "executive" || !team || item.teams.includes(team)),
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            F
          </span>
          <span className="group-data-[collapsible=icon]:hidden">FirstMan CRM</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUP_ORDER.map((group) => {
          const groupItems = items.filter((item) => item.group === group);
          if (groupItems.length === 0) return null;
          return (
            <SidebarGroup key={group}>
              <SidebarGroupLabel>{NAV_GROUP_LABEL[group]}</SidebarGroupLabel>
              <SidebarMenu>
                {groupItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
