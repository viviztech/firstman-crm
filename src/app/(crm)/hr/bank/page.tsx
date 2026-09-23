import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { getHrCapabilities, listEmployeeDirectory } from "@/services/hr";

export default async function HrBankPage() {
  const actor = await requireUser();
  if (!(await getHrCapabilities(actor)).includes("payroll_admin")) redirect("/hr");
  const employees = await listEmployeeDirectory();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Employee bank details</h1>
        <p className="text-sm text-muted-foreground">
          Payroll-only bank instructions. Account numbers are always masked after saving.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {employees.map((employee) => (
              <li key={employee.userId} className="py-3">
                <Link
                  href={`/hr/bank/${employee.userId}`}
                  className="font-medium text-sky-700 hover:underline"
                >
                  {employee.name} · {employee.employeeCode ?? "No employee code"}
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
