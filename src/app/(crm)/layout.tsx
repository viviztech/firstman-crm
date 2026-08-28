import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandPalette } from "@/components/command-palette";
import { type NotificationItem, NotificationsBell } from "@/components/notifications-bell";
import { TopbarUserMenu } from "@/components/topbar-user-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getPortalRole } from "@/lib/portal-role";
import { requireUser } from "@/lib/session";
import { countUnreadForUser, listNotificationsForUser } from "@/services/notifications";
import { getStaffScope } from "@/services/staff";

async function loadNotifications(
  userId: string,
): Promise<{ items: NotificationItem[]; totalCount: number; seeAllHref: string }> {
  const [rows, totalCount] = await Promise.all([
    listNotificationsForUser(userId, 5),
    countUnreadForUser(userId),
  ]);

  return {
    items: rows.map((notification) => ({
      id: notification.id,
      label: notification.title,
      sublabel: notification.body ?? "",
      href: notification.href,
    })),
    totalCount,
    seeAllHref: "/notifications",
  };
}

export default async function CrmLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const staffScope = await getStaffScope(user.id);
  const notifications = await loadNotifications(user.id);
  const showSettings = user.role === "super_admin" || user.role === "manager";
  const portalRole = getPortalRole(user.role, staffScope.team, staffScope.employeeType);

  return (
    <SidebarProvider>
      <AppSidebar role={user.role} team={staffScope.team} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <div className="max-w-md flex-1">
            <CommandPalette />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <NotificationsBell
              items={notifications.items}
              totalCount={notifications.totalCount}
              seeAllHref={notifications.seeAllHref}
            />
            <TopbarUserMenu
              name={user.name}
              role={user.role}
              roleLabel={portalRole}
              showSettings={showSettings}
            />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
