import { formatInTimeZone } from "date-fns-tz";
import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteClientButton } from "@/components/clients/delete-client-button";
import { ComplianceStatusBadge } from "@/components/compliance/compliance-status-badge";
import { ClientDocumentUploadForm } from "@/components/documents/client-document-upload-form";
import { DocumentChecklist } from "@/components/documents/document-checklist";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/db";
import { activityLogs } from "@/db/schema/activity-logs";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { getDocumentDownloadUrl } from "@/lib/signed-url";
import { getClient } from "@/services/clients";
import { listComplianceItemsForClient } from "@/services/compliance";
import { listDocumentsForOwner } from "@/services/documents";
import { getClientFinancialSummary, listInvoicesForClient } from "@/services/invoices";
import { listOrdersForClient } from "@/services/orders";

const STUB_TABS = [
  {
    value: "followups",
    label: "Follow-ups",
    copy: "Client-level follow-ups aren't tracked separately — see the Leads module for lead follow-ups.",
  },
];

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const client = await getClient(id, { userId: user.id, role: user.role });
  if (!client) {
    notFound();
  }

  const activity = await db.query.activityLogs.findMany({
    where: and(eq(activityLogs.entityType, "client"), eq(activityLogs.entityId, id)),
    orderBy: [desc(activityLogs.createdAt)],
    limit: 20,
  });

  const canManage = user.role !== "accountant";
  const canDelete = user.role === "super_admin" || user.role === "manager";
  const canViewFinancials = user.role !== "executive";

  const scope = { userId: user.id, role: user.role };
  const [orders, clientDocuments, complianceItems, invoices, financialSummary] = await Promise.all([
    listOrdersForClient(id, scope),
    listDocumentsForOwner("client", id),
    canManage ? listComplianceItemsForClient(id, scope) : Promise.resolve([]),
    canViewFinancials ? listInvoicesForClient(id, scope) : Promise.resolve([]),
    canViewFinancials ? getClientFinancialSummary(id, scope) : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{client.name}</h1>
            <Badge variant={client.type === "business" ? "default" : "secondary"}>
              {client.type}
            </Badge>
          </div>
          {client.businessName ? (
            <p className="text-sm text-muted-foreground">{client.businessName}</p>
          ) : null}
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/clients/${id}/edit`} />}
            >
              Edit
            </Button>
            {canDelete ? <DeleteClientButton clientId={id} clientName={client.name} /> : null}
          </div>
        ) : null}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          {canManage ? <TabsTrigger value="compliance">Compliance</TabsTrigger> : null}
          {canViewFinancials ? <TabsTrigger value="invoices">Invoices</TabsTrigger> : null}
          {STUB_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Contact</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm">
                <span>{client.phone}</span>
                <span>{client.email ?? "No email on file"}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Address</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {[client.address, client.city, client.state, client.pincode]
                  .filter(Boolean)
                  .join(", ") || "No address on file"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Tax IDs</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm">
                <span>GSTIN: {client.gstin ?? "—"}</span>
                <span>PAN: {client.pan ?? "—"}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Ownership</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm">
                <span>Assigned to: {client.assignee?.name ?? "Unassigned"}</span>
                <span>Referral: {client.referralSource ?? "—"}</span>
              </CardContent>
            </Card>
            {financialSummary ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">Billing</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1 text-sm">
                  <span>Lifetime value: {formatMoney(financialSummary.lifetimeValuePaise)}</span>
                  <span>Open balance: {formatMoney(financialSummary.openBalancePaise)}</span>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="orders">
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/50"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{order.orderNo}</span>
                    <span className="text-muted-foreground">{order.service.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>{formatMoney(order.quotedPricePaise)}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents">
          <div className="flex flex-col gap-4">
            {canManage ? <ClientDocumentUploadForm clientId={id} /> : null}
            <DocumentChecklist
              documents={clientDocuments.map((document) => ({
                id: document.id,
                label: document.label,
                status: document.status,
                fileName: document.fileName,
                rejectReason: document.rejectReason,
                downloadUrl: document.path ? getDocumentDownloadUrl(document.id) : null,
              }))}
              canManage={canManage}
            />
          </div>
        </TabsContent>

        {canManage ? (
          <TabsContent value="compliance">
            <div className="flex flex-col gap-4">
              <div>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href={`/compliance/new?clientId=${id}`} />}
                >
                  Add compliance item
                </Button>
              </div>
              {complianceItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No compliance items yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {complianceItems.map((item) => (
                    <Link
                      key={item.id}
                      href={`/compliance/${item.id}`}
                      className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/50"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{item.title}</span>
                        <span className="text-muted-foreground">
                          Due {formatInTimeZone(item.dueDate, env.TZ_DISPLAY, "d MMM yyyy")}
                        </span>
                      </div>
                      <ComplianceStatusBadge status={item.status} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        ) : null}

        {canViewFinancials ? (
          <TabsContent value="invoices">
            <div className="flex flex-col gap-4">
              <div>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href={`/invoices/new?clientId=${id}`} />}
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

        {STUB_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <p className="text-sm text-muted-foreground">{tab.copy}</p>
          </TabsContent>
        ))}

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
