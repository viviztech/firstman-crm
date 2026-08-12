import {
  AlertTriangleIcon,
  BriefcaseIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  FileWarningIcon,
  PackageSearchIcon,
  TrophyIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { PickUpJobCardButton } from "@/components/orders/pick-up-job-card-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OrderStatus } from "@/lib/badges";
import { cn } from "@/lib/utils";

type DashboardJobCard = {
  id: string;
  orderNo: string;
  status: OrderStatus;
  dueAt: Date;
  completedAt: Date | null;
  docsPending?: boolean;
  client: { id: string; name: string };
  service: { id: string; name: string };
};

type DashboardTask = {
  id: string;
  title: string;
  dueAt: Date | null;
  order: { id: string; orderNo: string };
};

function ViewJobCardButton({ orderId }: { orderId: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      nativeButton={false}
      render={<Link href={`/orders/${orderId}`} />}
    >
      View
    </Button>
  );
}

export function OperationsExecutiveDashboard({
  stats,
  myJobCards,
  tasks,
  completedJobCards,
  cancelledJobCards,
  availableJobCards,
}: {
  stats: {
    totalJobCards: number;
    overdueTasks: number;
    docsPending: number;
    completedThisMonth: number;
    dueThisWeek: number;
    completedTillDate: number;
  };
  myJobCards: DashboardJobCard[];
  tasks: DashboardTask[];
  completedJobCards: DashboardJobCard[];
  cancelledJobCards: DashboardJobCard[];
  availableJobCards: DashboardJobCard[];
}) {
  const now = new Date();
  const overdueTasks = tasks.filter((task) => task.dueAt && task.dueAt < now);
  const upcomingTasks = tasks.filter((task) => !task.dueAt || task.dueAt >= now);

  const tabs: { value: string; label: string; count: number; dot: string }[] = [
    {
      value: "available",
      label: "Available to pick",
      count: availableJobCards.length,
      dot: "bg-purple-500",
    },
    { value: "job-cards", label: "My Job Cards", count: myJobCards.length, dot: "bg-blue-500" },
    { value: "tasks", label: "Tasks", count: tasks.length, dot: "bg-amber-500" },
    {
      value: "completed",
      label: "Completed",
      count: completedJobCards.length,
      dot: "bg-green-500",
    },
    {
      value: "cancelled",
      label: "Cancelled",
      count: cancelledJobCards.length,
      dot: "bg-red-500",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">My operations dashboard</h2>
        <p className="text-sm text-muted-foreground">Your job cards, tasks, and results.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-7">
        <StatCard
          label="Available to pick"
          value={String(availableJobCards.length)}
          subLabel={availableJobCards.length === 0 ? "None right now" : "in your scope"}
          icon={PackageSearchIcon}
          color={availableJobCards.length > 0 ? "purple" : "slate"}
        />
        <StatCard
          label="Total job cards"
          value={String(stats.totalJobCards)}
          icon={BriefcaseIcon}
          color="blue"
        />
        <StatCard
          label="Overdue tasks"
          value={String(stats.overdueTasks)}
          icon={AlertTriangleIcon}
          color={stats.overdueTasks > 0 ? "red" : "slate"}
        />
        <StatCard
          label="Docs pending"
          value={String(stats.docsPending)}
          icon={FileWarningIcon}
          color="amber"
        />
        <StatCard
          label="Completed this month"
          value={String(stats.completedThisMonth)}
          icon={CheckCircle2Icon}
          color="green"
        />
        <StatCard
          label="Due this week"
          value={String(stats.dueThisWeek)}
          icon={CalendarClockIcon}
          color="orange"
        />
        <StatCard
          label="Completed till date"
          value={String(stats.completedTillDate)}
          icon={TrophyIcon}
          color="pink"
        />
      </div>

      <Tabs defaultValue="job-cards" className="gap-3">
        <TabsList className="h-auto! w-full flex-wrap justify-start gap-2 rounded-2xl bg-muted/60 p-1.5">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="h-10 gap-2 rounded-xl px-4 text-sm font-medium data-active:bg-primary data-active:text-primary-foreground"
            >
              <span className={cn("size-2 shrink-0 rounded-full", tab.dot)} aria-hidden="true" />
              {tab.label}
              <span className="text-xs opacity-70">({tab.count})</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="available">
          <JobCardTable
            rows={availableJobCards}
            emptyLabel="Nothing ready to pick up right now — check back later or ask a manager."
            renderAction={(orderId) => (
              <>
                <ViewJobCardButton orderId={orderId} />
                <PickUpJobCardButton orderId={orderId} />
              </>
            )}
          />
        </TabsContent>

        <TabsContent value="job-cards">
          <JobCardTable
            rows={myJobCards}
            emptyLabel="No job cards assigned to you yet."
            showDocsColumn
          />
        </TabsContent>

        <TabsContent value="tasks">
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="mb-2 text-sm font-medium text-destructive">
                Overdue ({overdueTasks.length})
              </h3>
              <TaskTable rows={overdueTasks} emptyLabel="No overdue tasks. Great work." />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                Upcoming ({upcomingTasks.length})
              </h3>
              <TaskTable rows={upcomingTasks} emptyLabel="Nothing else open right now." />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="completed">
          <JobCardTable rows={completedJobCards} emptyLabel="No completed job cards yet." />
        </TabsContent>

        <TabsContent value="cancelled">
          <JobCardTable rows={cancelledJobCards} emptyLabel="No cancelled job cards." />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Renders as a real table on md+ screens and as stacked cards below that — same rationale as
 * SalesExecutiveDashboard's EnquiryTable: a table forced into a narrow viewport either clips
 * columns or forces a horizontal scrollbar.
 */
function JobCardTable({
  rows,
  emptyLabel,
  showDocsColumn = false,
  renderAction,
}: {
  rows: DashboardJobCard[];
  emptyLabel: string;
  showDocsColumn?: boolean;
  /** Defaults to a plain "View" link — the Available-to-pick tab overrides this to add a
   * one-click claim action alongside it. */
  renderAction?: (orderId: string) => ReactNode;
}) {
  const action = renderAction ?? ((orderId: string) => <ViewJobCardButton orderId={orderId} />);
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Job Card #</th>
              <th className="px-4 py-2 font-medium">Client</th>
              <th className="px-4 py-2 font-medium">Service</th>
              <th className="px-4 py-2 font-medium">Status</th>
              {showDocsColumn ? <th className="px-4 py-2 font-medium">Docs</th> : null}
              <th className="px-4 py-2 font-medium">Due</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => {
              const overdue = !row.completedAt && row.dueAt < new Date();
              return (
                <tr key={row.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium whitespace-nowrap">{row.orderNo}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{row.client.name}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{row.service.name}</td>
                  <td className="px-4 py-2">
                    <OrderStatusBadge status={row.status} />
                  </td>
                  {showDocsColumn ? (
                    <td className="px-4 py-2">
                      {row.docsPending ? (
                        <Badge variant="destructive">Docs pending</Badge>
                      ) : (
                        <span className="text-muted-foreground">Complete</span>
                      )}
                    </td>
                  ) : null}
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={overdue ? "font-medium text-destructive" : undefined}>
                      {row.dueAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      {overdue ? " · Overdue" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">{action(row.id)}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => {
          const overdue = !row.completedAt && row.dueAt < new Date();
          return (
            <Card key={row.id}>
              <CardContent className="flex flex-col gap-2 py-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{row.orderNo}</span>
                  <OrderStatusBadge status={row.status} />
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Client</dt>
                  <dd>{row.client.name}</dd>
                  <dt className="text-muted-foreground">Service</dt>
                  <dd>{row.service.name}</dd>
                  <dt className="text-muted-foreground">Due</dt>
                  <dd className={overdue ? "font-medium text-destructive" : undefined}>
                    {row.dueAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    {overdue ? " · Overdue" : ""}
                  </dd>
                  {showDocsColumn ? (
                    <>
                      <dt className="text-muted-foreground">Docs</dt>
                      <dd>{row.docsPending ? "Pending" : "Complete"}</dd>
                    </>
                  ) : null}
                </dl>
                <div className="flex items-center gap-2 pt-1">{action(row.id)}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function TaskTable({ rows, emptyLabel }: { rows: DashboardTask[]; emptyLabel: string }) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </div>
  );
}

function TaskRow({ task }: { task: DashboardTask }) {
  return (
    <Link
      href={`/orders/${task.order.id}`}
      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
    >
      <div className="flex flex-col">
        <span className="font-medium">{task.title}</span>
        <span className="text-xs text-muted-foreground">{task.order.orderNo}</span>
      </div>
      {task.dueAt ? (
        <span className="text-xs text-muted-foreground">
          {task.dueAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </span>
      ) : null}
    </Link>
  );
}
