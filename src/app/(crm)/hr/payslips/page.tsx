import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { getOwnPayrollYtd } from "@/services/hr-payroll";
import { listMyPayslips } from "@/services/hr-payslips";

export default async function MyPayslipsPage() {
  const actor = await requireUser();
  const year = new Date().getFullYear();
  const [rows, ytd] = await Promise.all([listMyPayslips(actor.id), getOwnPayrollYtd(actor, year)]);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My payslips</h1>
        <p className="text-sm text-muted-foreground">
          Private payroll documents published after payroll approval and posting.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["YTD gross", ytd.grossPaise],
          ["YTD deductions", ytd.deductionsPaise],
          ["YTD net pay", ytd.netPayPaise],
          ["YTD employer contributions", ytd.employerContributionsPaise],
        ].map(([label, amount]) => (
          <Card key={String(label)}>
            <CardContent className="pt-5">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {year} {label}
              </p>
              <p className="mt-1 text-xl font-bold">{formatMoney(Number(amount))}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Published payslips</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length ? (
            <div className="divide-y">
              {rows.map((row) => (
                <div className="flex items-center justify-between gap-3 py-4" key={row.id}>
                  <div>
                    <p className="font-semibold">
                      {new Date(`${row.periodMonth}T00:00:00Z`).toLocaleDateString("en-IN", {
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Net pay {formatMoney(row.netPayPaise)}
                    </p>
                  </div>
                  <Link
                    href={`/api/hr/payslips/${row.entryId}`}
                    className="text-sm font-medium text-sky-700 hover:underline"
                  >
                    Download PDF
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No payslips have been published yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
