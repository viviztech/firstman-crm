import { ReportPageHeader } from "@/components/reports/report-page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ENQUIRY_SOURCE_LABEL } from "@/lib/badges";
import { requireRole } from "@/lib/session";
import { getEnquirySourcePerformance } from "@/services/reports";

export default async function EnquiriesBySourceReportPage() {
  await requireRole("super_admin", "manager", "accountant");
  const rows = await getEnquirySourcePerformance();

  return (
    <div className="flex flex-col gap-4">
      <ReportPageHeader
        title="Enquiry source performance"
        description="Enquiries, wins, and conversion rate by source."
        exportHref="/api/reports/enquiries-by-source/export"
      />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Total enquiries</TableHead>
              <TableHead className="text-right">Won</TableHead>
              <TableHead className="text-right">Lost</TableHead>
              <TableHead className="text-right">Conversion rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.source}>
                <TableCell>{ENQUIRY_SOURCE_LABEL[row.source]}</TableCell>
                <TableCell className="text-right">{row.total}</TableCell>
                <TableCell className="text-right">{row.won}</TableCell>
                <TableCell className="text-right">{row.lost}</TableCell>
                <TableCell className="text-right">
                  {(row.conversionRate * 100).toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
