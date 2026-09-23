import { redirect } from "next/navigation";
import {
  SalaryAssignmentForm,
  SalaryComponentForm,
  SalaryLineForm,
  SalaryStructureForm,
} from "@/components/hr/payroll-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { getHrCapabilities } from "@/services/hr";
import { listPayrollSettings } from "@/services/hr-payroll";

export default async function PayrollSettingsPage() {
  const actor = await requireUser();
  if (!(await getHrCapabilities(actor)).includes("payroll_admin")) redirect("/hr");
  const data = await listPayrollSettings(actor);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Salary settings</h1>
        <p className="text-sm text-muted-foreground">
          Effective-dated structures use fixed monthly values or percentages of BASIC.
        </p>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Salary component</CardTitle>
          </CardHeader>
          <CardContent>
            <SalaryComponentForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Salary structure</CardTitle>
          </CardHeader>
          <CardContent>
            <SalaryStructureForm />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Structure components</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <SalaryLineForm structures={data.structures} components={data.components} />
          <div className="divide-y">
            {data.lines.map((line) => (
              <div className="flex justify-between gap-3 py-2 text-sm" key={line.id}>
                <span>
                  {line.structureName} · {line.componentName}
                </span>
                <span>
                  {line.calculationMode === "fixed"
                    ? formatMoney(line.amountPaise ?? 0)
                    : `${(line.rateBasisPoints ?? 0) / 100}% of BASIC`}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Employee assignments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <SalaryAssignmentForm employees={data.employees} structures={data.structures} />
          <div className="divide-y">
            {data.assignments.map((assignment) => (
              <div className="flex justify-between gap-3 py-2 text-sm" key={assignment.id}>
                <span>
                  {assignment.employeeName} · {assignment.structureName}
                </span>
                <Badge variant="outline">
                  {assignment.effectiveFrom}
                  {assignment.effectiveTo ? ` to ${assignment.effectiveTo}` : " onward"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
