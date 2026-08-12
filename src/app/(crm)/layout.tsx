import type { ReactNode } from "react";
import { toScope } from "@/actions/shared";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandPalette } from "@/components/command-palette";
import { type NotificationItem, NotificationsBell } from "@/components/notifications-bell";
import { TopbarUserMenu } from "@/components/topbar-user-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { getMyOpenTasks, getOverdueTasks } from "@/services/analytics";
import { listFollowUpsDueForExecutive } from "@/services/enquiries";
import { getOutstandingInvoicesTotal } from "@/services/invoices";
import { getStaffScope } from "@/services/staff";

async function loadNotifications(
  user: Awaited<ReturnType<typeof requireUser>>,
  team: Awaited<ReturnType<typeof getStaffScope>>["team"],
): Promise<{ items: NotificationItem[]; totalCount: number; seeAllHref: string }> {
  if (user.role === "accountant") {
    const outstandingPaise = await getOutstandingInvoicesTotal(await toScope(user));
    if (!outstandingPaise) return { items: [], totalCount: 0, seeAllHref: "/invoices" };
    return {
      items: [
        {
          id: "outstanding",
          label: `${formatMoney(outstandingPaise)} outstanding`,
          sublabel: "Across unpaid invoices",
          href: "/invoices",
        },
      ],
      totalCount: 1,
      seeAllHref: "/invoices",
    };
  }

  if (user.role === "executive" && team === "sales") {
    const dueEnquiries = await listFollowUpsDueForExecutive(user.id);
    return {
      items: dueEnquiries.slice(0, 5).map((enquiry) => ({
        id: enquiry.id,
        label: enquiry.name,
        sublabel: `Follow-up due · ${enquiry.phone}`,
        href: `/enquiries/${enquiry.id}`,
      })),
      totalCount: dueEnquiries.length,
      seeAllHref: "/enquiries",
    };
  }

  if (user.role === "super_admin" || user.role === "manager") {
    const overdueTasks = await getOverdueTasks(await toScope(user), 6);
    return {
      items: overdueTasks.slice(0, 5).map((task) => ({
        id: task.id,
        label: task.title,
        sublabel: `Overdue · ${task.order.orderNo} · ${task.order.client.name}`,
        href: `/orders/${task.order.id}`,
      })),
      totalCount: overdueTasks.length,
      seeAllHref: "/orders",
    };
  }

  // Plain executive (non-sales): getOverdueTasks only franchise-filters "internal" employees per
  // its own scope caveat, so use the already userId-scoped getMyOpenTasks and filter client-side
  // instead of risking a cross-territory leak in the topbar.
  const now = Date.now();
  const myTasks = await getMyOpenTasks(user.id, 20);
  const overdue = myTasks.filter((task) => task.dueAt && new Date(task.dueAt).getTime() < now);
  return {
    items: overdue.slice(0, 5).map((task) => ({
      id: task.id,
      label: task.title,
      sublabel: `Overdue · ${task.order.orderNo}`,
      href: `/orders/${task.order.id}`,
    })),
    totalCount: overdue.length,
    seeAllHref: "/orders",
  };
}

export default async function CrmLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const staffScope = await getStaffScope(user.id);
  const notifications = await loadNotifications(user, staffScope.team);
  const showSettings = user.role === "super_admin" || user.role === "manager";

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
            <TopbarUserMenu name={user.name} role={user.role} showSettings={showSettings} />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
