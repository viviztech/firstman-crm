import { formatInTimeZone } from "date-fns-tz";
import {
  AlertTriangleIcon,
  BarChart3Icon,
  BriefcaseIcon,
  CalendarClockIcon,
  ClipboardListIcon,
  ClockIcon,
  ListChecksIcon,
  MapPinIcon,
  ReceiptIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  TrophyIcon,
} from "lucide-react";
import Link from "next/link";
import { toScope } from "@/actions/shared";
import { ComplianceStatusBadge } from "@/components/compliance/compliance-status-badge";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { EnquiriesFunnelChart } from "@/components/dashboard/enquiries-funnel-chart";
import { FranchiseDashboard } from "@/components/dashboard/franchise-dashboard";
import { OperationsExecutiveDashboard } from "@/components/dashboard/operations-executive-dashboard";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { RoleWorkspaceDashboard } from "@/components/dashboard/role-workspace-dashboard";
import { SalesExecutiveDashboard } from "@/components/dashboard/sales-executive-dashboard";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { ORDER_STATUS_ORDER } from "@/lib/badges";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { getPortalRole } from "@/lib/portal-role";
import { requireUser } from "@/lib/session";
import {
  getEnquiriesThisMonthByStatus,
  getMyOpenTasks,
  getMyOrdersInProgress,
  getOrdersByStatusCounts,
  getOverdueTasks,
  getRevenueThisMonthVsLast,
  getTopServicesByRevenue,
} from "@/services/analytics";
import { listServiceOptions } from "@/services/catalog";
import { listUpcomingComplianceItems } from "@/services/compliance";
import {
  getMySalesDashboardStats,
  listFollowUpsDueForExecutive,
  listMyActiveEnquiries,
  listMyFollowUpsSplit,
  listMyLostEnquiriesForExecutive,
  listMyWonEnquiries,
  listOpenEnquiries,
} from "@/services/enquiries";
import { getExpensesThisMonth } from "@/services/expenses";
import { getFranchiseCommissionDashboard } from "@/services/franchise-commissions";
import {
  getCollectionsThisMonth,
  getOutstandingInvoicesTotal,
  getOverdueInvoicesForDigest,
} from "@/services/invoices";
import {
  getMyJobCardDashboardStats,
  listJobCardsAvailableToPickUp,
  listMyCancelledJobCards,
  listMyCompletedJobCards,
  listMyJobCards,
} from "@/services/orders";
import { listAssignableStaff } from "@/services/users";

export default async function DashboardPage() {
  const user = await requireUser();
  const scope = await toScope(user);

  const showCompliance =
    user.role === "super_admin" || user.role === "manager" || user.role === "executive";
  const upcomingCompliance = showCompliance ? await listUpcomingComplianceItems(scope, 14) : [];

  const showAccountantStats = user.role === "accountant";
  const [outstandingPaise, collectionsPaise, expensesPaise, overdueInvoices] = showAccountantStats
    ? await Promise.all([
        getOutstandingInvoicesTotal(scope),
        getCollectionsThisMonth(scope),
        getExpensesThisMonth(scope),
        getOverdueInvoicesForDigest(),
      ])
    : [null, null, null, []];

  const showManagerStats = user.role === "super_admin" || user.role === "manager";
  const isBackofficeAdmin = user.role === "manager" && scope.team !== "workforce";
  const isWorkforceManager = user.role === "manager" && scope.team === "workforce";
  const [enquiriesByStatus, revenue, ordersByStatus, overdueTasks, topServices] = showManagerStats
    ? await Promise.all([
        getEnquiriesThisMonthByStatus(scope),
        getRevenueThisMonthVsLast(),
        getOrdersByStatusCounts(scope),
        getOverdueTasks(scope, 8),
        getTopServicesByRevenue(scope, 5),
      ])
    : [[], { thisMonthPaise: 0, lastMonthPaise: 0 }, [], [], []];

  const isFranchise = user.role === "executive" && scope.employeeType === "franchise";
  const isSalesExecutive = user.role === "executive" && scope.team === "sales";
  const isOperationsExecutive = user.role === "executive" && scope.team === "operations";
  const showExecutiveStats =
    user.role === "executive" && !isSalesExecutive && !isOperationsExecutive;
  const showTerritoryCard =
    (showExecutiveStats || isOperationsExecutive) &&
    (scope.employeeType === "franchise" || scope.serviceIds.length > 0);
  const [myFollowUps, myTasks, myOrders] = showExecutiveStats
    ? await Promise.all([
        listFollowUpsDueForExecutive(user.id),
        getMyOpenTasks(user.id),
        getMyOrdersInProgress(user.id),
      ])
    : [[], [], []];
  // The scope card also renders for operations executives (showTerritoryCard above), who take a
  // separate code path from showExecutiveStats — so this fetch can't be nested inside that branch's
  // Promise.all without leaving their service names permanently empty.
  const assignedServices =
    (showExecutiveStats || isOperationsExecutive) && scope.serviceIds.length > 0
      ? await listServiceOptions()
      : [];
  const assignedServiceNames = assignedServices
    .filter((service) => scope.serviceIds.includes(service.id))
    .map((service) => service.name);

  const [
    opsStats,
    myJobCards,
    myTasksForOps,
    completedJobCards,
    cancelledJobCards,
    availableJobCards,
  ] = isOperationsExecutive
    ? await Promise.all([
        getMyJobCardDashboardStats(user.id),
        listMyJobCards(user.id),
        getMyOpenTasks(user.id, 50),
        listMyCompletedJobCards(user.id),
        listMyCancelledJobCards(user.id),
        listJobCardsAvailableToPickUp(scope),
      ])
    : [
        {
          totalJobCards: 0,
          overdueTasks: 0,
          docsPending: 0,
          completedThisMonth: 0,
          dueThisWeek: 0,
          completedTillDate: 0,
        },
        [],
        [],
        [],
        [],
        [],
      ];

  const [
    salesStats,
    myEnquiries,
    openEnquiries,
    myFollowUpsSplit,
    wonEnquiries,
    lostEnquiries,
    salesServices,
    salesStaff,
  ] = isSalesExecutive
    ? await Promise.all([
        getMySalesDashboardStats(user.id),
        listMyActiveEnquiries(user.id),
        listOpenEnquiries(scope),
        listMyFollowUpsSplit(user.id),
        listMyWonEnquiries(user.id),
        listMyLostEnquiriesForExecutive(user.id),
        listServiceOptions(),
        listAssignableStaff(),
      ])
    : [
        {
          totalEnquiries: 0,
          followupsDue: 0,
          closedThisMonth: 0,
          lostThisMonth: 0,
          salesThisMonthPaise: 0,
          totalSalesPaise: 0,
        },
        [],
        [],
        { today: [], missed: [] },
        [],
        [],
        [],
        [],
      ];

  const franchiseCommission = isFranchise ? await getFranchiseCommissionDashboard(scope) : null;

  const ordersByStatusMap = new Map(ordersByStatus.map((row) => [row.status, row.count]));
  const activeJobCardCount = ordersByStatus
    .filter((row) => row.status !== "completed" && row.status !== "cancelled")
    .reduce((total, row) => total + row.count, 0);
  const portalRole = getPortalRole(user.role, scope.team, scope.employeeType);

  const headline = showAccountantStats
    ? {
        label: "Outstanding invoices",
        value: formatMoney(outstandingPaise ?? 0),
        icon: ReceiptIcon,
        color: "orange" as const,
      }
    : showManagerStats
      ? {
          label: "Revenue this month",
          value: formatMoney(revenue.thisMonthPaise),
          icon: TrendingUpIcon,
          color: "green" as const,
        }
      : isSalesExecutive
        ? {
            label: "Sales this month",
            value: formatMoney(salesStats.salesThisMonthPaise),
            icon: TrendingUpIcon,
            color: "purple" as const,
          }
        : isOperationsExecutive
          ? {
              label: "Job cards in progress",
              value: String(opsStats.totalJobCards),
              icon: BriefcaseIcon,
              color: "blue" as const,
            }
          : showExecutiveStats
            ? {
                label: "Open tasks",
                value: String(myTasks.length),
                icon: ListChecksIcon,
                color: "amber" as const,
              }
            : undefined;

  return (
    <div className="flex flex-col gap-4">
      <DashboardHero userName={user.name} roleLabel={portalRole} headline={headline} />

      {isBackofficeAdmin || isWorkforceManager ? (
        <RoleWorkspaceDashboard
          workspace={isWorkforceManager ? "workforce" : "backoffice"}
          enquiryCount={enquiriesByStatus.reduce((total, row) => total + row.count, 0)}
          jobCardCount={activeJobCardCount}
          overdueTaskCount={overdueTasks.length}
        />
      ) : null}

      {showAccountantStats ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Outstanding invoices"
            value={formatMoney(outstandingPaise ?? 0)}
            icon={ReceiptIcon}
            color="orange"
          />
          <StatCard
            label="Collections this month"
            value={formatMoney(collectionsPaise ?? 0)}
            icon={TrendingUpIcon}
            color="green"
          />
          <StatCard
            label="Expenses this month"
            value={formatMoney(expensesPaise ?? 0)}
            icon={TrendingDownIcon}
            color="purple"
          />
          <StatCard
            label="Overdue invoices"
            value={String(overdueInvoices.length)}
            subLabel={overdueInvoices.length === 0 ? "None right now" : "need follow-up"}
            icon={AlertTriangleIcon}
            color={overdueInvoices.length > 0 ? "red" : "slate"}
          />
        </div>
      ) : null}

      {showAccountantStats ? (
        <SectionCard title="Overdue invoices" icon={AlertTriangleIcon} color="red">
          {overdueInvoices.length === 0 ? (
            <p className="text-muted-foreground">No overdue invoices. Nice and clean.</p>
          ) : (
            overdueInvoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{invoice.invoiceNo}</span>
                  <span className="text-muted-foreground">{invoice.client.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    Due {formatInTimeZone(invoice.dueDate, env.TZ_DISPLAY, "d MMM yyyy")}
                  </span>
                  <span className="font-medium text-destructive">
                    {formatMoney(invoice.outstandingPaise)}
                  </span>
                </div>
              </Link>
            ))
          )}
        </SectionCard>
      ) : null}

      {isSalesExecutive ? (
        <SalesExecutiveDashboard
          stats={salesStats}
          myEnquiries={myEnquiries}
          openEnquiries={openEnquiries}
          followUpsToday={myFollowUpsSplit.today}
          followUpsMissed={myFollowUpsSplit.missed}
          wonEnquiries={wonEnquiries}
          lostEnquiries={lostEnquiries}
          staff={salesStaff}
          services={salesServices}
        />
      ) : null}

      {franchiseCommission ? <FranchiseDashboard data={franchiseCommission} /> : null}

      {isOperationsExecutive ? (
        <OperationsExecutiveDashboard
          stats={opsStats}
          myJobCards={myJobCards}
          tasks={myTasksForOps}
          completedJobCards={completedJobCards}
          cancelledJobCards={cancelledJobCards}
          availableJobCards={availableJobCards}
        />
      ) : null}

      {showManagerStats ? (
        <div className="grid gap-4 md:grid-cols-2">
          <SectionCard title="Enquiries this month by status" icon={BarChart3Icon} color="blue">
            <EnquiriesFunnelChart data={enquiriesByStatus} />
          </SectionCard>
          <SectionCard title="Revenue this month vs last" icon={TrendingUpIcon} color="green">
            <RevenueChart
              thisMonthPaise={revenue.thisMonthPaise}
              lastMonthPaise={revenue.lastMonthPaise}
            />
          </SectionCard>
        </div>
      ) : null}

      {showManagerStats ? (
        <div className="grid gap-4 md:grid-cols-3">
          <SectionCard title="Job cards by status" icon={ClipboardListIcon} color="purple">
            {ORDER_STATUS_ORDER.map((status) => (
              <div key={status} className="flex items-center justify-between">
                <OrderStatusBadge status={status} />
                <span className="font-medium">{ordersByStatusMap.get(status) ?? 0}</span>
              </div>
            ))}
          </SectionCard>

          <SectionCard title="Overdue tasks" icon={AlertTriangleIcon} color="red">
            {overdueTasks.length === 0 ? (
              <p className="text-muted-foreground">No overdue tasks.</p>
            ) : (
              overdueTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/orders/${task.order.id}`}
                  className="flex flex-col rounded-lg border p-2 hover:bg-muted/50"
                >
                  <span className="font-medium">{task.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {task.order.orderNo} · {task.order.client.name}
                  </span>
                </Link>
              ))
            )}
          </SectionCard>

          <SectionCard title="Top services by revenue" icon={TrophyIcon} color="amber">
            {topServices.length === 0 ? (
              <p className="text-muted-foreground">No job card revenue yet.</p>
            ) : (
              topServices.map((service) => (
                <div key={service.serviceId} className="flex items-center justify-between">
                  <span>{service.serviceName}</span>
                  <span className="font-medium">{formatMoney(service.totalPaise)}</span>
                </div>
              ))
            )}
          </SectionCard>
        </div>
      ) : null}

      {showTerritoryCard ? (
        <SectionCard title="Your scope" icon={MapPinIcon} color="teal">
          {scope.employeeType === "franchise" ? (
            <span>
              Territory:{" "}
              {scope.pincodes.length > 0 ? scope.pincodes.join(", ") : "No pincodes allocated yet"}
            </span>
          ) : null}
          {scope.serviceIds.length > 0 ? (
            <span>Services: {assignedServiceNames.join(", ")}</span>
          ) : null}
        </SectionCard>
      ) : null}

      {showExecutiveStats ? (
        <div className="grid gap-4 md:grid-cols-3">
          <SectionCard title="My follow-ups today" icon={ClockIcon} color="blue">
            {myFollowUps.length === 0 ? (
              <p className="text-muted-foreground">Nothing due today.</p>
            ) : (
              myFollowUps.map((enquiry) => (
                <Link
                  key={enquiry.id}
                  href={`/enquiries/${enquiry.id}`}
                  className="flex flex-col rounded-lg border p-2 hover:bg-muted/50"
                >
                  <span className="font-medium">{enquiry.name}</span>
                  <span className="text-xs text-muted-foreground">{enquiry.phone}</span>
                </Link>
              ))
            )}
          </SectionCard>

          <SectionCard title="My open tasks" icon={ListChecksIcon} color="amber">
            {myTasks.length === 0 ? (
              <p className="text-muted-foreground">No open tasks.</p>
            ) : (
              myTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/orders/${task.order.id}`}
                  className="flex flex-col rounded-lg border p-2 hover:bg-muted/50"
                >
                  <span className="font-medium">{task.title}</span>
                  <span className="text-xs text-muted-foreground">{task.order.orderNo}</span>
                </Link>
              ))
            )}
          </SectionCard>

          <SectionCard title="My job cards in progress" icon={BriefcaseIcon} color="purple">
            {myOrders.length === 0 ? (
              <p className="text-muted-foreground">No job cards in progress.</p>
            ) : (
              myOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex flex-col rounded-lg border p-2 hover:bg-muted/50"
                >
                  <span className="font-medium">{order.orderNo}</span>
                  <span className="text-xs text-muted-foreground">
                    {order.client.name} · {order.service.name}
                  </span>
                </Link>
              ))
            )}
          </SectionCard>
        </div>
      ) : null}

      {showCompliance ? (
        <SectionCard
          title="Upcoming compliance deadlines (next 14 days)"
          icon={CalendarClockIcon}
          color="teal"
        >
          {upcomingCompliance.length === 0 ? (
            <p className="text-muted-foreground">Nothing due in the next 14 days.</p>
          ) : (
            upcomingCompliance.map((item) => (
              <Link
                key={item.id}
                href={`/compliance/${item.id}`}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{item.title}</span>
                  <span className="text-muted-foreground">{item.clientName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>{formatInTimeZone(item.dueDate, env.TZ_DISPLAY, "d MMM yyyy")}</span>
                  <ComplianceStatusBadge status={item.status} />
                </div>
              </Link>
            ))
          )}
        </SectionCard>
      ) : null}
    </div>
  );
}
