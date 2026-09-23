import Link from "next/link";
import { redirect } from "next/navigation";
import { EmployeeImportForm } from "@/components/hr/employee-import-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { getHrCapabilities } from "@/services/hr";

export default async function EmployeeImportPage() {
  const actor = await requireUser();
  if (!(await getHrCapabilities(actor)).includes("hr_admin")) redirect("/hr");
  return (
    <div className="space-y-5">
      <div>
        <Link href="/hr/employees" className="text-sm font-medium text-sky-700 hover:underline">
          ← Employees
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Import employee profiles</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>CSV import</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeImportForm />
        </CardContent>
      </Card>
    </div>
  );
}
