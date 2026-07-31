import Link from "next/link";
import { ReportPageHeader } from "@/components/reports/report-page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import { requireRole } from "@/lib/session";
import { getAgingReceivables, summarizeAgingBuckets } from "@/services/reports";

export default async function AgingReceivablesReportPage() {
  await requireRole("super_admin", "manager", "accountant");
  const rows = await getAgingReceivables();
  const summary = summarizeAgingBuckets(rows);

  return (
    <div className="flex flex-col gap-4">
      <ReportPageHeader
        title="Aging receivables"
        description="Open invoice balances bucketed by days past due."
        exportHref="/api/reports/aging-receivables/export"
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {summary.map((bucket) => (
          <div key={bucket.bucket} className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground uppercase">{bucket.bucket}</p>
            <p className="text-lg font-semibold">{formatMoney(bucket.totalPaise)}</p>
            <p className="text-xs text-muted-foreground">{bucket.count} invoices</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead className="text-right">Days past due</TableHead>
              <TableHead>Bucket</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No open invoices.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.invoiceId}>
                  <TableCell>
                    <Link href={`/invoices/${row.invoiceId}`} className="hover:underline">
                      {row.invoiceNo}
                    </Link>
                  </TableCell>
                  <TableCell>{row.clientName}</TableCell>
                  <TableCell>{row.dueDate.toLocaleDateString("en-IN")}</TableCell>
                  <TableCell className="text-right">{row.daysPastDue}</TableCell>
                  <TableCell>{row.bucket}</TableCell>
                  <TableCell className="text-right">{formatMoney(row.balancePaise)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
