import { formatInTimeZone } from "date-fns-tz";
import { and, desc, eq } from "drizzle-orm";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  HistoryIcon,
  ReceiptIndianRupeeIcon,
  Rows3Icon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { toScope } from "@/actions/shared";
import { CancelInvoiceButton } from "@/components/invoices/cancel-invoice-button";
import { DeleteInvoiceButton } from "@/components/invoices/delete-invoice-button";
import { InvoiceKindBadge } from "@/components/invoices/invoice-kind-badge";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { RecordPaymentDialog } from "@/components/invoices/record-payment-dialog";
import { SendInvoiceButton } from "@/components/invoices/send-invoice-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db";
import { activityLogs } from "@/db/schema/activity-logs";
import { PAYMENT_METHOD_LABEL } from "@/lib/badges";
import { env } from "@/lib/env";
import { formatMoney, sumPaise } from "@/lib/money";
import { requireRole } from "@/lib/session";
import { getInvoicePdfUrl } from "@/lib/signed-url";
import { getInvoice } from "@/services/invoices";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("super_admin", "manager", "accountant");
  const { id } = await params;

  const invoice = await getInvoice(id, await toScope(user));
  if (!invoice) {
    notFound();
  }

  const activity = await db.query.activityLogs.findMany({
    where: and(eq(activityLogs.entityType, "invoice"), eq(activityLogs.entityId, id)),
    orderBy: [desc(activityLogs.createdAt)],
    limit: 20,
  });

  const canDelete =
    user.role === "super_admin" || user.role === "manager" || user.role === "accountant";
  const isDraft = invoice.status === "draft";
  const isPayable =
    invoice.status === "sent" ||
    invoice.status === "partially_paid" ||
    invoice.status === "overdue";
  const canCancel =
    invoice.status !== "cancelled" && invoice.status !== "paid" && invoice.payments.length === 0;

  const paidSoFar = sumPaise(invoice.payments.map((payment) => payment.amountPaise));
  const balancePaise = invoice.totalPaise - paidSoFar;

  return (
    <div className="invoice-workflow flex min-w-0 flex-col gap-5">
      <section className="relative overflow-hidden rounded-2xl border border-pink-100 bg-gradient-to-r from-pink-50/70 via-white to-white p-5 shadow-[0_18px_45px_-32px_rgba(107,28,64,0.35)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2">
            <Link
              href="/invoices"
              className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-pink-600 hover:text-pink-800"
            >
              <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
              Back to invoices
            </Link>
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-pink-600 text-white shadow-sm shadow-pink-200">
                <ReceiptIndianRupeeIcon className="size-5" aria-hidden="true" />
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-mono text-2xl font-bold tracking-[-0.035em] text-[#0b203a]">
                  {invoice.invoiceNo}
                </h1>
                <InvoiceKindBadge kind={invoice.kind} />
                <InvoiceStatusBadge status={invoice.status} />
              </div>
            </div>
            <p className="ml-14 text-sm text-slate-500">
              <Link href={`/clients/${invoice.client.id}`} className="hover:underline">
                {invoice.client.name}
              </Link>
              {invoice.order ? (
                <>
                  {" · "}
                  <Link href={`/orders/${invoice.order.id}`} className="hover:underline">
                    {invoice.order.orderNo}
                  </Link>
                </>
              ) : null}
            </p>
            {invoice.kind === "proforma" ? (
              <p className="ml-14 max-w-2xl text-xs leading-5 text-slate-500">
                Advance-payment request only — not a tax invoice. The final GST invoice is generated
                automatically once the order is completed and this proforma is paid in full.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={getInvoicePdfUrl(id)} target="_blank" rel="noreferrer" />}
            >
              Download PDF
            </Button>
            {isDraft ? (
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={`/invoices/${id}/edit`} />}
              >
                Edit
              </Button>
            ) : null}
            {isDraft ? <SendInvoiceButton invoiceId={id} invoiceNo={invoice.invoiceNo} /> : null}
            {isPayable ? <RecordPaymentDialog invoiceId={id} balancePaise={balancePaise} /> : null}
            {canCancel ? (
              <CancelInvoiceButton invoiceId={id} invoiceNo={invoice.invoiceNo} />
            ) : null}
            {isDraft && canDelete ? (
              <DeleteInvoiceButton invoiceId={id} invoiceNo={invoice.invoiceNo} />
            ) : null}
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Rows3Icon className="size-4 text-pink-600" aria-hidden="true" />
            Line items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lineItems.map((item, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: line items are a static, server-rendered snapshot that's never reordered client-side
                <TableRow key={`${item.description}-${index}`}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.qty}</TableCell>
                  <TableCell className="text-right">{formatMoney(item.ratePaise)}</TableCell>
                  <TableCell className="text-right">{formatMoney(item.amountPaise)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex flex-col items-end gap-1 text-sm">
            <div className="flex w-56 justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(invoice.subtotalPaise)}</span>
            </div>
            <div className="flex w-56 justify-between">
              <span className="text-muted-foreground">GST ({invoice.gstRate}%)</span>
              <span>{formatMoney(invoice.gstAmountPaise)}</span>
            </div>
            <div className="flex w-56 justify-between border-t border-pink-100 pt-2 text-base font-bold text-[#0b203a]">
              <span>Total</span>
              <span>{formatMoney(invoice.totalPaise)}</span>
            </div>
            {paidSoFar > 0 ? (
              <div className="flex w-56 justify-between text-muted-foreground">
                <span>Paid</span>
                <span>{formatMoney(paidSoFar)}</span>
              </div>
            ) : null}
            {isPayable ? (
              <div className="flex w-56 justify-between font-medium">
                <span>Balance due</span>
                <span>{formatMoney(balancePaise)}</span>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDaysIcon className="size-4 text-pink-600" aria-hidden="true" />
              Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <span>Due: {formatInTimeZone(invoice.dueDate, env.TZ_DISPLAY, "d MMM yyyy")}</span>
            {invoice.sentAt ? (
              <span>
                Sent: {formatInTimeZone(invoice.sentAt, env.TZ_DISPLAY, "d MMM yyyy, h:mm a")}
              </span>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCardIcon className="size-4 text-pink-600" aria-hidden="true" />
              Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {invoice.payments.length === 0 ? (
              <span className="text-muted-foreground">No payments recorded yet.</span>
            ) : (
              invoice.payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between">
                  <span>
                    {PAYMENT_METHOD_LABEL[payment.method]}
                    {payment.reference ? ` · ${payment.reference}` : ""}
                  </span>
                  <span className="flex items-center gap-2">
                    {formatMoney(payment.amountPaise)}
                    <span className="text-xs text-muted-foreground">
                      {formatInTimeZone(payment.paidAt, env.TZ_DISPLAY, "d MMM yyyy")}
                    </span>
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-pink-100 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[#0b203a]">
          <HistoryIcon className="size-4.5 text-pink-600" aria-hidden="true" />
          Activity
        </h2>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          activity.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-sm"
            >
              <div className="flex flex-col gap-1 text-slate-500 sm:flex-row sm:justify-between">
                <span>{entry.action}</span>
                <span>
                  {formatInTimeZone(entry.createdAt, env.TZ_DISPLAY, "d MMM yyyy, h:mm a")}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
