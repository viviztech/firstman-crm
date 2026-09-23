import { Settings2Icon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PayrollPeriodForm } from "@/components/hr/payroll-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { getHrCapabilities } from "@/services/hr";
import { listPayrollPeriods } from "@/services/hr-payroll";

export default async function PayrollPage() {
  const actor = await requireUser();
  if (!(await getHrCapabilities(actor)).includes("payroll_admin")) redirect("/hr");
  const periods = await listPayrollPeriods(actor);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
          <p className="text-sm text-muted-foreground">
            Calculate, approve, post, and reconcile monthly payroll.
          </p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/hr/payroll/settings" />}
        >
          <Settings2Icon />
          Salary settings
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>New payroll run</CardTitle>
        </CardHeader>
        <CardContent>
          <PayrollPeriodForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Payroll periods</CardTitle>
        </CardHeader>
        <CardContent>
          {periods.length ? (
            <div className="divide-y">
              {periods.map((period) => (
                <Link
                  href={`/hr/payroll/${period.id}`}
                  key={period.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 hover:text-sky-700"
                >
                  <div>
                    <p className="font-semibold">
                      {new Date(`${period.periodMonth}T00:00:00Z`).toLocaleDateString("en-IN", {
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {period.employeeCount} employees · {formatMoney(period.netPayPaise)} net pay
                    </p>
                  </div>
                  <Badge variant="outline">{period.status}</Badge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No payroll periods created.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
