import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StatutoryDetailsForm } from "@/components/hr/statutory-details-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { getHrCapabilities, listEmployeeDirectory } from "@/services/hr";
import { getEmployeeStatutoryDetails } from "@/services/hr-statutory";

export default async function EmployeeStatutoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireUser();
  if (!(await getHrCapabilities(actor)).includes("payroll_admin")) redirect("/hr");
  const { id } = await params;
  const [employees, existing] = await Promise.all([
    listEmployeeDirectory(),
    getEmployeeStatutoryDetails(id, actor),
  ]);
  const employee = employees.find((row) => row.userId === id);
  if (!employee) notFound();
  return (
    <div className="space-y-5">
      <div>
        <Link href="/hr/statutory" className="text-sm font-medium text-sky-700 hover:underline">
          ← Statutory details
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{employee.name}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Statutory record</CardTitle>
        </CardHeader>
        <CardContent>
          <StatutoryDetailsForm userId={id} existing={existing} />
        </CardContent>
      </Card>
    </div>
  );
}
