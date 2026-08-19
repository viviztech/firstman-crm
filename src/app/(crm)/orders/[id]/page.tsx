import { formatInTimeZone } from "date-fns-tz";
import { and, desc, eq } from "drizzle-orm";
import {
  Briefcase,
  CalendarClock,
  FileCheck2,
  History,
  IndianRupee,
  ListChecks,
  Receipt,
  Sparkles,
  User,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { toScope } from "@/actions/shared";
import { STAT_COLOR_CLASSES, type StatColor } from "@/components/dashboard/dashboard-colors";
import { StatCard } from "@/components/dashboard/stat-card";
import { DocumentChecklist } from "@/components/documents/document-checklist";
import { InvoiceKindBadge } from "@/components/invoices/invoice-kind-badge";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { DeleteOrderButton } from "@/components/orders/delete-order-button";
import { ForceCompleteOrderButton } from "@/components/orders/force-complete-order-button";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OrderStatusSelect } from "@/components/orders/order-status-select";
import { OrderStatusTimeline } from "@/components/orders/order-status-timeline";
import { OrderTaskList } from "@/components/orders/order-task-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionIcon } from "@/components/ui/section-icon";
import { db } from "@/db";
import { activityLogs } from "@/db/schema/activity-logs";
import {
  INVOICE_STATUS_STAT_COLOR,
  isWipStatus,
  ORDER_STATUS_STAT_COLOR,
  SERVICE_RELATION_TYPE_LABEL,
} from "@/lib/badges";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { getDocumentDownloadUrl } from "@/lib/signed-url";
import { cn } from "@/lib/utils";
import { listServiceRelations } from "@/services/catalog";
import { listInvoicesForOrder } from "@/services/invoices";
import { getOrder } from "@/services/orders";

function getPaymentSummary(invoices: { status: string }[]) {
  if (invoices.length === 0) {
    return { value: "No invoice", subLabel: "Not billed yet", color: "slate" as StatColor };
  }
  const countLabel = `${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`;
  if (invoices.some((invoice) => invoice.status === "overdue")) {
    return { value: "Overdue", subLabel: countLabel, color: "red" as StatColor };
  }
  if (invoices.every((invoice) => invoice.status === "paid")) {
    return { value: "Paid", subLabel: countLabel, color: "green" as StatColor };
  }
  if (invoices.some((invoice) => invoice.status === "partially_paid")) {
    return { value: "Partially paid", subLabel: countLabel, color: "amber" as StatColor };
  }
  return { value: "Unpaid", subLabel: countLabel, color: "blue" as StatColor };
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const scope = await toScope(user);

  const order = await getOrder(id, scope);
  if (!order) {
    notFound();
  }

  const canManage = user.role !== "accountant";
  const relatedServices = canManage ? await listServiceRelations(order.service.id) : [];

  const activity = await db.query.activityLogs.findMany({
    where: and(eq(activityLogs.entityType, "order"), eq(activityLogs.entityId, id)),
    orderBy: [desc(activityLogs.createdAt)],
    limit: 20,
  });

  const canDelete = user.role === "super_admin" || user.role === "manager";
  const canViewFinancials = user.role !== "executive";
  const isOverdue = !order.completedAt && new Date(order.dueAt) < new Date();

  const invoices = canViewFinancials ? await listInvoicesForOrder(id, scope) : [];

  const statusColor = ORDER_STATUS_STAT_COLOR[order.status];
  const statusClasses = STAT_COLOR_CLASSES[statusColor];

  const doneTasks = order.tasks.filter((task) => task.status === "done").length;
  const taskPercent =
    order.tasks.length === 0 ? 0 : Math.round((doneTasks / order.tasks.length) * 100);
  const taskColor: StatColor =
    order.tasks.length === 0 ? "slate" : taskPercent === 100 ? "green" : "blue";

  const verifiedDocs = order.documents.filter((document) => document.status === "verified").length;
  const docPercent =
    order.documents.length === 0 ? 0 : Math.round((verifiedDocs / order.documents.length) * 100);
  const docColor: StatColor =
    order.documents.length === 0 ? "slate" : docPercent === 100 ? "green" : "amber";

  const paymentSummary = getPaymentSummary(invoices);

  const now = new Date();
  const dueDate = new Date(order.dueAt);
  const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / 86_400_000);
  const dueTile = order.completedAt
    ? {
        value: "Completed",
        subLabel: formatInTimeZone(order.completedAt, env.TZ_DISPLAY, "d MMM yyyy"),
        color: "green" as StatColor,
      }
    : isOverdue
      ? {
          value: `${Math.abs(daysRemaining)}d overdue`,
          subLabel: `Was due ${formatInTimeZone(order.dueAt, env.TZ_DISPLAY, "d MMM yyyy")}`,
          color: "red" as StatColor,
        }
      : {
          value: `${daysRemaining}d left`,
          subLabel: `Due ${formatInTimeZone(order.dueAt, env.TZ_DISPLAY, "d MMM yyyy")}`,
          color: daysRemaining <= 7 ? ("orange" as StatColor) : ("blue" as StatColor),
        };

  return (
    <div className="flex flex-col gap-6">
      <Card className={cn("border-l-4", statusClasses.border)}>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl",
                  statusClasses.chip,
                )}
              >
                <Briefcase className="size-5" />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">{order.orderNo}</h1>
                  {isWipStatus(order.status) ? <Badge variant="secondary">WIP</Badge> : null}
                  {canManage ? (
                    <OrderStatusSelect orderId={id} status={order.status} />
                  ) : (
                    <OrderStatusBadge status={order.status} />
                  )}
                </div>
                <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                  <User className="size-3.5" aria-hidden="true" />
                  <Link
                    href={`/clients/${order.client.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {order.client.name}
                  </Link>
                  <span aria-hidden="true">·</span>
                  <span>{order.service.name}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                nativeButton={false}
                render={<a href={`/api/orders/${id}/job-card`} target="_blank" rel="noreferrer" />}
              >
                Job card (PDF)
              </Button>
              {canManage ? (
                <>
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={`/orders/${id}/edit`} />}
                  >
                    Edit
                  </Button>
                  {canDelete ? <DeleteOrderButton orderId={id} orderNo={order.orderNo} /> : null}
                </>
              ) : null}
              {user.role === "super_admin" && order.status !== "completed" ? (
                <ForceCompleteOrderButton orderId={id} orderNo={order.orderNo} />
              ) : null}
            </div>
          </div>
          <OrderStatusTimeline status={order.status} />
        </CardContent>
      </Card>

      <div
        className={cn(
          "grid grid-cols-2 gap-4",
          canViewFinancials ? "sm:grid-cols-4" : "sm:grid-cols-3",
        )}
      >
        <StatCard
          label="Tasks"
          value={order.tasks.length === 0 ? "—" : `${doneTasks}/${order.tasks.length}`}
          subLabel={order.tasks.length === 0 ? "None generated" : `${taskPercent}% done`}
          icon={ListChecks}
          color={taskColor}
        />
        <StatCard
          label="Documents"
          value={order.documents.length === 0 ? "—" : `${verifiedDocs}/${order.documents.length}`}
          subLabel={order.documents.length === 0 ? "None required" : `${docPercent}% verified`}
          icon={FileCheck2}
          color={docColor}
        />
        {canViewFinancials ? (
          <StatCard
            label="Payment"
            value={paymentSummary.value}
            subLabel={paymentSummary.subLabel}
            icon={IndianRupee}
            color={paymentSummary.color}
          />
        ) : null}
        <StatCard
          label="Due date"
          value={dueTile.value}
          subLabel={dueTile.subLabel}
          icon={CalendarClock}
          color={dueTile.color}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <SectionIcon icon={IndianRupee} color="green" />
              Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <span>Quoted: {formatMoney(order.quotedPricePaise)}</span>
            <span>Govt. fee: {order.govtFeePaise ? formatMoney(order.govtFeePaise) : "—"}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <SectionIcon icon={CalendarClock} color="purple" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <span>Started: {formatInTimeZone(order.startedAt, env.TZ_DISPLAY, "d MMM yyyy")}</span>
            <span className={isOverdue ? "font-medium text-destructive" : undefined}>
              Due: {formatInTimeZone(order.dueAt, env.TZ_DISPLAY, "d MMM yyyy")}
              {isOverdue ? " · Overdue" : ""}
            </span>
            {order.completedAt ? (
              <span>
                Completed: {formatInTimeZone(order.completedAt, env.TZ_DISPLAY, "d MMM yyyy")}
              </span>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <SectionIcon icon={User} color="blue" />
              Ownership
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            Assigned to: {order.assignee?.name ?? "Unassigned"}
          </CardContent>
        </Card>
        {order.notes ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-wrap">{order.notes}</CardContent>
          </Card>
        ) : null}
        {relatedServices.length > 0 ? (
          <Card className="sm:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                <SectionIcon icon={Sparkles} color="pink" />
                You might also suggest
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {relatedServices.map((relation) => (
                <div key={relation.id} className="flex items-center justify-between">
                  <span>
                    {relation.relatedService.name}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({SERVICE_RELATION_TYPE_LABEL[relation.relationType]})
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    {formatMoney(relation.relatedService.basePricePaise)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SectionIcon icon={ListChecks} color="blue" />
            Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OrderTaskList orderId={id} tasks={order.tasks} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SectionIcon icon={FileCheck2} color="amber" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentChecklist
            documents={order.documents.map((document) => ({
              id: document.id,
              label: document.label,
              status: document.status,
              fileName: document.fileName,
              rejectReason: document.rejectReason,
              downloadUrl: document.path ? getDocumentDownloadUrl(document.id) : null,
            }))}
            canManage={canManage}
          />
        </CardContent>
      </Card>

      {canViewFinancials ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SectionIcon icon={Receipt} color="teal" />
              Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={`/invoices/new?clientId=${order.client.id}&orderId=${id}`} />}
              >
                New invoice
              </Button>
            </div>
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {invoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/invoices/${invoice.id}`}
                    className={cn(
                      "flex items-center justify-between rounded-lg border border-l-4 p-3 text-sm hover:bg-muted/50",
                      STAT_COLOR_CLASSES[INVOICE_STATUS_STAT_COLOR[invoice.status]].border,
                    )}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{invoice.invoiceNo}</span>
                        <InvoiceKindBadge kind={invoice.kind} />
                      </div>
                      <span className="text-muted-foreground">
                        Due {formatInTimeZone(invoice.dueDate, env.TZ_DISPLAY, "d MMM yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>{formatMoney(invoice.totalPaise)}</span>
                      <InvoiceStatusBadge status={invoice.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SectionIcon icon={History} color="slate" />
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            activity.map((entry) => (
              <div key={entry.id} className="rounded-lg border p-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{entry.action}</span>
                  <span>
                    {formatInTimeZone(entry.createdAt, env.TZ_DISPLAY, "d MMM yyyy, h:mm a")}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
