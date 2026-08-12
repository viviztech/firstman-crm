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
    <div className="flex flex-col gap-4">
      <ReportPageHeader
        title="Revenue by service"
        description="Job card revenue (quoted price, non-cancelled job cards) grouped by catalog service."
        exportHref="/api/reports/revenue-by-service/export"
      />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
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
