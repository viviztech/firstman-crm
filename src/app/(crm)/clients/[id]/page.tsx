import { formatInTimeZone } from "date-fns-tz";
import { and, desc, eq } from "drizzle-orm";
import {
  Briefcase,
  Building2,
  CalendarClock,
  FileCheck2,
  IndianRupee,
  Landmark,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { toScope } from "@/actions/shared";
import { DeleteClientButton } from "@/components/clients/delete-client-button";
import { WhatsAppOptOutToggle } from "@/components/clients/whatsapp-opt-out-toggle";
import { ComplianceStatusBadge } from "@/components/compliance/compliance-status-badge";
import { STAT_COLOR_CLASSES, type StatColor } from "@/components/dashboard/dashboard-colors";
import { StatCard } from "@/components/dashboard/stat-card";
import { ClientDocumentUploadForm } from "@/components/documents/client-document-upload-form";
import { DocumentChecklist } from "@/components/documents/document-checklist";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionIcon } from "@/components/ui/section-icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/db";
import { activityLogs } from "@/db/schema/activity-logs";
import {
  COMPLIANCE_STATUS_STAT_COLOR,
  INVOICE_STATUS_STAT_COLOR,
  ORDER_STATUS_STAT_COLOR,
} from "@/lib/badges";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { getDocumentDownloadUrl } from "@/lib/signed-url";
import { cn } from "@/lib/utils";
import { getClient } from "@/services/clients";
import { listComplianceItemsForClient } from "@/services/compliance";
import { listDocumentsForOwner } from "@/services/documents";
import { getClientFinancialSummary, listInvoicesForClient } from "@/services/invoices";
import { listOrdersForClient } from "@/services/orders";

const STUB_TABS = [
  {
    value: "followups",
    label: "Follow-ups",
    copy: "Client-level follow-ups aren't tracked separately — see the Enquiries module for enquiry follow-ups.",
  },
];

/** Small colored dot + count shown inline on a tab trigger — the same "what's inside without
 * clicking in" signal the operations dashboard tabs use, applied here to a profile page. */
function TabMeta({ count, dot }: { count: number; dot: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden="true" />
      <span className="text-xs opacity-70">({count})</span>
    </span>
  );
}

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const scope = await toScope(user);

  const client = await getClient(id, scope);
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

  const [orders, clientDocuments, complianceItems, invoices, financialSummary] = await Promise.all([
    listOrdersForClient(id, scope),
    listDocumentsForOwner("client", id),
    canManage ? listComplianceItemsForClient(id, scope) : Promise.resolve([]),
    canViewFinancials ? listInvoicesForClient(id, scope) : Promise.resolve([]),
    canViewFinancials ? getClientFinancialSummary(id, scope) : Promise.resolve(null),
  ]);

  const typeColor: StatColor = client.type === "business" ? "purple" : "teal";
  const typeClasses = STAT_COLOR_CLASSES[typeColor];
  const TypeIcon = client.type === "business" ? Building2 : User;

  const activeOrders = orders.filter(
    (order) => order.status !== "completed" && order.status !== "cancelled",
  ).length;
  const jobCardColor: StatColor =
    orders.length === 0 ? "slate" : activeOrders > 0 ? "blue" : "green";

  const overdueCompliance = complianceItems.filter((item) => item.status === "overdue").length;
  const dueSoonCompliance = complianceItems.filter((item) => item.status === "due_soon").length;
  const complianceColor: StatColor =
    overdueCompliance > 0
      ? "red"
      : dueSoonCompliance > 0
        ? "amber"
        : complianceItems.length === 0
          ? "slate"
          : "green";
  const complianceSubLabel =
    overdueCompliance > 0
      ? `${overdueCompliance} overdue`
      : dueSoonCompliance > 0
        ? `${dueSoonCompliance} due soon`
        : complianceItems.length === 0
          ? "None tracked"
          : "All on track";

  const verifiedDocs = clientDocuments.filter((document) => document.status === "verified").length;
  const docColor: StatColor =
    clientDocuments.length === 0
      ? "slate"
      : verifiedDocs === clientDocuments.length
        ? "green"
        : "amber";

  const tileCount = 2 + (canManage ? 1 : 0) + (canViewFinancials ? 1 : 0);

  return (
    <div className="flex flex-col gap-6">
      <Card className={cn("border-l-4", typeClasses.border)}>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl",
                typeClasses.chip,
              )}
            >
              <TypeIcon className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
                <Badge variant={client.type === "business" ? "default" : "secondary"}>
                  {client.type}
                </Badge>
              </div>
              {client.businessName ? (
                <p className="text-sm text-muted-foreground">{client.businessName}</p>
              ) : null}
              <p className="text-sm text-muted-foreground">Customer ID: {client.cin ?? "—"}</p>
            </div>
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
        </CardContent>
      </Card>

      <div
        className={cn(
          "grid grid-cols-2 gap-4",
          tileCount === 2 && "sm:grid-cols-2",
          tileCount === 3 && "sm:grid-cols-3",
          tileCount === 4 && "sm:grid-cols-4",
        )}
      >
        <StatCard
          label="Job cards"
          value={String(orders.length)}
          subLabel={orders.length === 0 ? "None yet" : `${activeOrders} active`}
          icon={Briefcase}
          color={jobCardColor}
        />
        <StatCard
          label="Documents"
          value={clientDocuments.length === 0 ? "—" : `${verifiedDocs}/${clientDocuments.length}`}
          subLabel={clientDocuments.length === 0 ? "None on file" : "verified"}
          icon={FileCheck2}
          color={docColor}
        />
        {canManage ? (
          <StatCard
            label="Compliance"
            value={String(complianceItems.length)}
            subLabel={complianceSubLabel}
            icon={CalendarClock}
            color={complianceColor}
          />
        ) : null}
        {canViewFinancials && financialSummary ? (
          <StatCard
            label="Billing"
            value={formatMoney(financialSummary.lifetimeValuePaise)}
            subLabel={
              financialSummary.openBalancePaise > 0
                ? `${formatMoney(financialSummary.openBalancePaise)} due`
                : "No balance due"
            }
            icon={IndianRupee}
            color={financialSummary.openBalancePaise > 0 ? "red" : "green"}
          />
        ) : null}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">
            Job Cards
            <TabMeta count={orders.length} dot="bg-blue-500" />
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents
            <TabMeta count={clientDocuments.length} dot="bg-amber-500" />
          </TabsTrigger>
          {canManage ? (
            <TabsTrigger value="compliance">
              Compliance
              <TabMeta count={complianceItems.length} dot="bg-purple-500" />
            </TabsTrigger>
          ) : null}
          {canViewFinancials ? (
            <TabsTrigger value="invoices">
              Invoices
              <TabMeta count={invoices.length} dot="bg-teal-500" />
            </TabsTrigger>
          ) : null}
          {STUB_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="activity">
            Activity
            <TabMeta count={activity.length} dot="bg-slate-400" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                  <SectionIcon icon={Phone} color="blue" />
                  Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <span>{client.phone}</span>
                <span>{client.email ?? "No email on file"}</span>
                {canManage ? (
                  <WhatsAppOptOutToggle clientId={id} initialOptedOut={client.whatsappOptedOut} />
                ) : client.whatsappOptedOut ? (
                  <span className="text-muted-foreground">Opted out of WhatsApp messages</span>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                  <SectionIcon icon={MapPin} color="purple" />
                  Address
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {[client.address, client.city, client.state, client.pincode]
                  .filter(Boolean)
                  .join(", ") || "No address on file"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                  <SectionIcon icon={Landmark} color="teal" />
                  Tax IDs
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm">
                <span>GSTIN: {client.gstin ?? "—"}</span>
                <span>PAN: {client.pan ?? "—"}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                  <SectionIcon icon={User} color="slate" />
                  Ownership
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm">
                <span>Assigned to: {client.assignee?.name ?? "Unassigned"}</span>
                <span>Referral: {client.referralSource ?? "—"}</span>
              </CardContent>
            </Card>
            {financialSummary ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                    <SectionIcon icon={IndianRupee} color="green" />
                    Billing
                  </CardTitle>
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
            <p className="text-sm text-muted-foreground">No job cards yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className={cn(
                    "flex items-center justify-between rounded-lg border border-l-4 p-3 text-sm hover:bg-muted/50",
                    STAT_COLOR_CLASSES[ORDER_STATUS_STAT_COLOR[order.status]].border,
                  )}
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
                      className={cn(
                        "flex items-center justify-between rounded-lg border border-l-4 p-3 text-sm hover:bg-muted/50",
                        STAT_COLOR_CLASSES[COMPLIANCE_STATUS_STAT_COLOR[item.status]].border,
                      )}
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
                      className={cn(
                        "flex items-center justify-between rounded-lg border border-l-4 p-3 text-sm hover:bg-muted/50",
                        STAT_COLOR_CLASSES[INVOICE_STATUS_STAT_COLOR[invoice.status]].border,
                      )}
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
