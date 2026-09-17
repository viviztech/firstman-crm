"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUP_LABEL, NAV_GROUP_ORDER, NAV_ITEMS } from "@/components/nav-config";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
    <Sidebar
      collapsible="icon"
      className="border-r border-pink-100/80 bg-white shadow-[8px_0_32px_-28px_rgba(107,28,64,0.35)]"
    >
      <SidebarHeader className="border-b border-pink-50 px-3 py-4">
        <div className="flex items-center gap-2.5 px-1">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-600 to-pink-400 text-sm font-black text-white shadow-sm shadow-pink-200">
            F
          </span>
          <span className="min-w-0 leading-none group-data-[collapsible=icon]:hidden">
            <span className="block text-sm font-bold tracking-[-0.02em] text-[#0b203a]">
              FirstMan
            </span>
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-pink-600">
              CRM workspace
            </span>
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-2">
        {NAV_GROUP_ORDER.map((group) => {
          const groupItems = items.filter((item) => item.group === group);
          if (groupItems.length === 0) return null;
          return (
            <SidebarGroup key={group} className="px-1 py-2">
              <SidebarGroupLabel className="px-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                {NAV_GROUP_LABEL[group]}
              </SidebarGroupLabel>
              <SidebarMenu className="gap-1">
                {groupItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                      tooltip={item.title}
                      className="h-10 rounded-xl px-3 font-medium text-slate-600 transition-[background-color,color,box-shadow,transform] hover:translate-x-0.5 hover:bg-pink-50 hover:text-pink-700 data-active:bg-pink-50 data-active:font-semibold data-active:text-pink-700 data-active:shadow-[inset_3px_0_0_#ba2a66] group-data-[collapsible=icon]:rounded-lg"
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
      <SidebarFooter className="border-t border-pink-50 p-3">
        <div className="rounded-xl border border-pink-100 bg-gradient-to-br from-pink-50 to-pink-100/60 p-3 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-[#0b203a]">Quick find</p>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">Search any CRM record</p>
            </div>
            <kbd className="rounded-md border border-pink-100 bg-white px-2 py-1 text-[10px] font-semibold text-pink-700 shadow-sm">
              Ctrl K
            </kbd>
          </div>
        </div>
        <div className="hidden size-2 self-center rounded-full bg-emerald-400 ring-4 ring-emerald-50 group-data-[collapsible=icon]:block" />
      </SidebarFooter>
    </Sidebar>
  );
}
