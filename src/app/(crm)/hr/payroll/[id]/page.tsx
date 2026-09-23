import { DownloadIcon } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PayrollAdjustmentForm, PayrollTransitionButton } from "@/components/hr/payroll-forms";
import { Badge } from "@/components/ui/badge";
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
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { getHrCapabilities } from "@/services/hr";
import { getPayrollPeriod, listPayrollAdjustmentOptions } from "@/services/hr-payroll";

export default async function PayrollPeriodPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  if (!(await getHrCapabilities(actor)).includes("payroll_admin")) redirect("/hr");
  const { id } = await params;
  const [data, options] = await Promise.all([
    getPayrollPeriod(id, actor),
    listPayrollAdjustmentOptions(id, actor),
  ]);
  if (!data) notFound();
  const { period, entries } = data;
  const totals = entries.reduce(
    (result, entry) => ({
      gross: result.gross + entry.grossPaise,
      deductions: result.deductions + entry.deductionsPaise,
      net: result.net + entry.netPayPaise,
      cost: result.cost + entry.totalCostPaise,
    }),
    { gross: 0, deductions: 0, net: 0, cost: 0 },
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Payroll · {period.periodMonth.slice(0, 7)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {period.periodStart} to {period.periodEnd}
          </p>
        </div>
        <Badge variant="outline">{period.status}</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Gross", totals.gross],
          ["Deductions", totals.deductions],
          ["Net pay", totals.net],
          ["Employer cost", totals.cost],
        ].map(([label, amount]) => (
          <Card key={String(label)}>
            <CardContent className="pt-5">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
              <p className="mt-1 text-xl font-bold">{formatMoney(Number(amount))}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {["draft", "calculated"].includes(period.status) ? (
            <PayrollTransitionButton periodId={id} transition="calculate" />
          ) : null}
          {period.status === "calculated" ? (
            <PayrollTransitionButton periodId={id} transition="approve" />
          ) : null}
          {period.status === "approved" ? (
            <PayrollTransitionButton periodId={id} transition="post" />
          ) : null}
          {period.status === "posted" ? (
            <PayrollTransitionButton periodId={id} transition="paid" />
          ) : null}
          {entries.length
            ? [
                ["register", "Payroll register"],
                ["components", "Component totals"],
                ["bank", "Masked bank advice"],
                ["statutory", "Statutory working"],
                ["ytd", "Employee YTD"],
              ].map(([kind, label]) => (
                <Button
                  key={kind}
                  variant="outline"
                  nativeButton={false}
                  render={<Link href={`/api/hr/payroll/${id}/export?kind=${kind}`} />}
                >
                  <DownloadIcon />
                  {label}
                </Button>
              ))
            : null}
        </CardContent>
      </Card>
      {["draft", "calculated"].includes(period.status) ? (
        <Card>
          <CardHeader>
            <CardTitle>One-time adjustment</CardTitle>
          </CardHeader>
          <CardContent>
            <PayrollAdjustmentForm
              periodId={id}
              employees={options.employees}
              components={options.components}
            />
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Employee results</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Paid / eligible</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net pay</TableHead>
                  <TableHead>Validation</TableHead>
                  <TableHead>Payslip</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <span className="font-medium">{entry.employeeName}</span>
                      <br />
                      <span className="text-xs text-muted-foreground">{entry.employeeCode}</span>
                    </TableCell>
                    <TableCell>
                      {entry.paidHalfDays / 2} / {entry.eligibleHalfDays / 2}
                    </TableCell>
                    <TableCell>{formatMoney(entry.grossPaise)}</TableCell>
                    <TableCell>{formatMoney(entry.deductionsPaise)}</TableCell>
                    <TableCell className="font-medium">{formatMoney(entry.netPayPaise)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.validationStatus}</Badge>
                      {entry.validationMessages.length ? (
                        <p className="max-w-48 whitespace-normal text-xs text-destructive">
                          {entry.validationMessages.join(" ")}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {entry.payslip ? (
                        <Link
                          className="text-sky-700 hover:underline"
                          href={`/api/hr/payslips/${entry.id}`}
                        >
                          Download
                        </Link>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Calculate this period to create employee snapshots.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
