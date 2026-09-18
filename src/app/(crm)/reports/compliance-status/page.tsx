import { ComplianceStatusBadge } from "@/components/compliance/compliance-status-badge";
import { ReportPageHeader } from "@/components/reports/report-page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/session";
import { getComplianceFilingStatus } from "@/services/reports";

export default async function ComplianceStatusReportPage() {
  await requireRole("super_admin", "manager");
  const rows = await getComplianceFilingStatus();

  return (
    <div className="reports-workflow flex min-w-0 flex-col gap-5">
      <ReportPageHeader
        title="Compliance filing status"
        description="Compliance items grouped by current status."
        exportHref="/api/reports/compliance-status/export"
      />

      <div className="overflow-x-auto rounded-2xl border border-pink-100 bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-pink-50/70">
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.status}>
                <TableCell>
                  <ComplianceStatusBadge status={row.status} />
                </TableCell>
                <TableCell className="text-right">{row.count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
