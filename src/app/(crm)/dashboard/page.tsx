import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import { ComplianceStatusBadge } from "@/components/compliance/compliance-status-badge";
import { LeadsFunnelChart } from "@/components/dashboard/leads-funnel-chart";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ORDER_STATUS_ORDER } from "@/lib/badges";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";
import {
  getLeadsThisMonthByStatus,
  getMyOpenTasks,
  getMyOrdersInProgress,
  getOrdersByStatusCounts,
  getOverdueTasks,
  getRevenueThisMonthVsLast,
  getTopServicesByRevenue,
} from "@/services/analytics";
import { listUpcomingComplianceItems } from "@/services/compliance";
import { getExpensesThisMonth } from "@/services/expenses";
import { getCollectionsThisMonth, getOutstandingInvoicesTotal } from "@/services/invoices";
import { listFollowUpsDueForExecutive } from "@/services/leads";

export default async function DashboardPage() {
  const user = await requireUser();
  const scope = { userId: user.id, role: user.role };

  const showCompliance =
    user.role === "super_admin" || user.role === "manager" || user.role === "executive";
  const upcomingCompliance = showCompliance ? await listUpcomingComplianceItems(scope, 14) : [];

  const showAccountantStats = user.role === "accountant";
  const [outstandingPaise, collectionsPaise, expensesPaise] = showAccountantStats
    ? await Promise.all([
        getOutstandingInvoicesTotal(scope),
        getCollectionsThisMonth(scope),
        getExpensesThisMonth(scope),
      ])
    : [null, null, null];

  const showManagerStats = user.role === "super_admin" || user.role === "manager";
  const [leadsByStatus, revenue, ordersByStatus, overdueTasks, topServices] = showManagerStats
    ? await Promise.all([
        getLeadsThisMonthByStatus(scope),
        getRevenueThisMonthVsLast(),
        getOrdersByStatusCounts(scope),
        getOverdueTasks(scope, 8),
        getTopServicesByRevenue(scope, 5),
      ])
    : [[], { thisMonthPaise: 0, lastMonthPaise: 0 }, [], [], []];

  const showExecutiveStats = user.role === "executive";
  const [myFollowUps, myTasks, myOrders] = showExecutiveStats
    ? await Promise.all([
        listFollowUpsDueForExecutive(user.id),
        getMyOpenTasks(user.id),
        getMyOrdersInProgress(user.id),
      ])
    : [[], [], []];

  const ordersByStatusMap = new Map(ordersByStatus.map((row) => [row.status, row.count]));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Welcome back
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{user.name}</CardContent>
        </Card>

        {showAccountantStats ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Outstanding invoices
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatMoney(outstandingPaise ?? 0)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Collections this month
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatMoney(collectionsPaise ?? 0)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Expenses this month
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatMoney(expensesPaise ?? 0)}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {showManagerStats ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Leads this month by status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeadsFunnelChart data={leadsByStatus} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Revenue this month vs last
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueChart
                thisMonthPaise={revenue.thisMonthPaise}
                lastMonthPaise={revenue.lastMonthPaise}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {showManagerStats ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Orders by status
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {ORDER_STATUS_ORDER.map((status) => (
                <div key={status} className="flex items-center justify-between">
                  <OrderStatusBadge status={status} />
                  <span className="font-medium">{ordersByStatusMap.get(status) ?? 0}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Overdue tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Top services by revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {topServices.length === 0 ? (
                <p className="text-muted-foreground">No order revenue yet.</p>
              ) : (
                topServices.map((service) => (
                  <div key={service.serviceId} className="flex items-center justify-between">
                    <span>{service.serviceName}</span>
                    <span className="font-medium">{formatMoney(service.totalPaise)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {showExecutiveStats ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                My follow-ups today
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {myFollowUps.length === 0 ? (
                <p className="text-muted-foreground">Nothing due today.</p>
              ) : (
                myFollowUps.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="flex flex-col rounded-lg border p-2 hover:bg-muted/50"
                  >
                    <span className="font-medium">{lead.name}</span>
                    <span className="text-xs text-muted-foreground">{lead.phone}</span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                My open tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                My orders in progress
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {myOrders.length === 0 ? (
                <p className="text-muted-foreground">No orders in progress.</p>
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
            </CardContent>
          </Card>
        </div>
      ) : null}

      {showCompliance ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming compliance deadlines (next 14 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingCompliance.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing due in the next 14 days.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {upcomingCompliance.map((item) => (
                  <Link
                    key={item.id}
                    href={`/compliance/${item.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/50"
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
