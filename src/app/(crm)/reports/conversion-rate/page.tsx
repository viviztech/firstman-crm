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
import { getConversionRateByExecutive, getEnquirySourcePerformance } from "@/services/reports";

export default async function ConversionRateReportPage() {
  await requireRole("super_admin", "manager", "accountant");
  const [bySource, byExecutive] = await Promise.all([
    getEnquirySourcePerformance(),
    getConversionRateByExecutive(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <ReportPageHeader
        title="Conversion rate"
        description="Conversion rate broken down by source and by executive."
        exportHref="/api/reports/conversion-rate/export"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">By source</h2>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Won</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bySource.map((row) => (
                  <TableRow key={row.source}>
                    <TableCell>{ENQUIRY_SOURCE_LABEL[row.source]}</TableCell>
                    <TableCell className="text-right">{row.total}</TableCell>
                    <TableCell className="text-right">{row.won}</TableCell>
                    <TableCell className="text-right">
                      {(row.conversionRate * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">By executive</h2>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Executive</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Won</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byExecutive.map((row) => (
                  <TableRow key={row.executiveId}>
                    <TableCell>{row.executiveName}</TableCell>
                    <TableCell className="text-right">{row.total}</TableCell>
                    <TableCell className="text-right">{row.won}</TableCell>
                    <TableCell className="text-right">
                      {(row.conversionRate * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
