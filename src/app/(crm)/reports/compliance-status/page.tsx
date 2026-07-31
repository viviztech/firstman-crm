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
  await requireRole("super_admin", "manager", "accountant");
  const rows = await getComplianceFilingStatus();

  return (
    <div className="flex flex-col gap-4">
      <ReportPageHeader
        title="Compliance filing status"
        description="Compliance items grouped by current status."
        exportHref="/api/reports/compliance-status/export"
      />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
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
