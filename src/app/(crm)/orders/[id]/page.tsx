import { formatInTimeZone } from "date-fns-tz";
import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentChecklist } from "@/components/documents/document-checklist";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { DeleteOrderButton } from "@/components/orders/delete-order-button";
import { OrderStatusSelect } from "@/components/orders/order-status-select";
import { OrderStatusTimeline } from "@/components/orders/order-status-timeline";
import { OrderTaskList } from "@/components/orders/order-task-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/db";
import { activityLogs } from "@/db/schema/activity-logs";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { getDocumentDownloadUrl } from "@/lib/signed-url";
import { listInvoicesForOrder } from "@/services/invoices";
import { getOrder } from "@/services/orders";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const order = await getOrder(id, { userId: user.id, role: user.role });
  if (!order) {
    notFound();
  }

  const activity = await db.query.activityLogs.findMany({
    where: and(eq(activityLogs.entityType, "order"), eq(activityLogs.entityId, id)),
    orderBy: [desc(activityLogs.createdAt)],
    limit: 20,
  });

  const canManage = user.role !== "accountant";
  const canDelete = user.role === "super_admin" || user.role === "manager";
  const canViewFinancials = user.role !== "executive";
  const isOverdue = !order.completedAt && new Date(order.dueAt) < new Date();

  const scope = { userId: user.id, role: user.role };
  const invoices = canViewFinancials ? await listInvoicesForOrder(id, scope) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{order.orderNo}</h1>
            {canManage ? <OrderStatusSelect orderId={id} status={order.status} /> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            <Link href={`/clients/${order.client.id}`} className="hover:underline">
              {order.client.name}
            </Link>{" "}
            · {order.service.name}
          </p>
          <OrderStatusTimeline status={order.status} />
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/orders/${id}/edit`} />}
            >
              Edit
            </Button>
            {canDelete ? <DeleteOrderButton orderId={id} orderNo={order.orderNo} /> : null}
          </div>
        ) : null}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          {canViewFinancials ? <TabsTrigger value="invoices">Invoices</TabsTrigger> : null}
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Pricing</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm">
                <span>Quoted: {formatMoney(order.quotedPricePaise)}</span>
                <span>Govt. fee: {order.govtFeePaise ? formatMoney(order.govtFeePaise) : "—"}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm">
                <span>
                  Started: {formatInTimeZone(order.startedAt, env.TZ_DISPLAY, "d MMM yyyy")}
                </span>
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
                <CardTitle className="text-sm text-muted-foreground">Ownership</CardTitle>
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
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <OrderTaskList orderId={id} tasks={order.tasks} />
        </TabsContent>

        <TabsContent value="documents">
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
        </TabsContent>

        {canViewFinancials ? (
          <TabsContent value="invoices">
            <div className="flex flex-col gap-4">
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
                      className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/50"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{invoice.invoiceNo}</span>
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
            </div>
          </TabsContent>
        ) : null}

        <TabsContent value="activity">
          <div className="flex flex-col gap-2">
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
