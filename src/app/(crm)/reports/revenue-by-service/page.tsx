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
import { getRevenueByService } from "@/services/reports";

export default async function RevenueByServiceReportPage() {
  await requireRole("super_admin", "manager", "accountant");
  const rows = await getRevenueByService();

  return (
    <div className="reports-workflow flex min-w-0 flex-col gap-5">
      <ReportPageHeader
        title="Revenue by service"
        description="Job card revenue (quoted price, non-cancelled job cards) grouped by catalog service."
        exportHref="/api/reports/revenue-by-service/export"
      />

      <div className="overflow-x-auto rounded-2xl border border-pink-100 bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-pink-50/70">
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead className="text-right">Job Cards</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.serviceId}>
                <TableCell>{row.serviceName}</TableCell>
                <TableCell className="text-right">{row.orderCount}</TableCell>
                <TableCell className="text-right">{formatMoney(row.totalPaise)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
