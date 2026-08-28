import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { requirePortalClient } from "@/lib/portal-session";
import {
  listDocumentsForPortalClient,
  listInvoicesForPortalClient,
  listOrdersForPortalClient,
} from "@/services/portal";

export default async function PortalDashboardPage() {
  const portalClient = await requirePortalClient();

  const [orders, invoices, documents] = await Promise.all([
    listOrdersForPortalClient(portalClient.clientId),
    listInvoicesForPortalClient(portalClient.clientId),
    listDocumentsForPortalClient(portalClient.clientId),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6 sm:p-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your orders</h1>
        <form action="/api/portal/logout" method="POST">
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>

      <section className="flex flex-col gap-4">
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="flex flex-col gap-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{order.service.name}</p>
                  <p className="text-sm text-muted-foreground">{order.orderNo}</p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              {order.tasks.length > 0 ? (
                <ul className="flex flex-col gap-1 border-t pt-3 text-sm">
                  {order.tasks.map((task) => (
                    <li key={task.id} className="flex items-center justify-between gap-2">
                      <span
                        className={
                          task.status === "done" ? "text-muted-foreground line-through" : undefined
                        }
                      >
                        {task.title}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {task.status.replace(/_/g, " ")}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Invoices</h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        ) : (
          <div className="flex flex-col divide-y rounded-lg border">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="font-medium">{invoice.invoiceNo}</p>
                  <p className="text-muted-foreground">
                    Due {formatInTimeZone(invoice.dueDate, env.TZ_DISPLAY, "d MMM yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span>{formatMoney(invoice.totalPaise)}</span>
                  <InvoiceStatusBadge status={invoice.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Documents</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents yet.</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-lg border text-sm">
            {documents.map((document) => (
              <li key={document.id} className="flex items-center justify-between gap-3 p-4">
                <span>{document.label}</span>
                {document.path ? (
                  <Link
                    href={`/api/portal/documents/${document.id}/download`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Download
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground capitalize">
                    {document.status}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
