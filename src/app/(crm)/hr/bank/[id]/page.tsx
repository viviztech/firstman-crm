import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BankAccountForm } from "@/components/hr/bank-account-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { getHrCapabilities, listEmployeeDirectory } from "@/services/hr";
import { getEmployeeBankAccount } from "@/services/hr-bank";

export default async function EmployeeBankPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  if (!(await getHrCapabilities(actor)).includes("payroll_admin")) redirect("/hr");
  const { id } = await params;
  const employee = (await listEmployeeDirectory()).find((row) => row.userId === id);
  if (!employee) notFound();
  const existing = await getEmployeeBankAccount(id, actor);
  return (
    <div className="space-y-5">
      <div>
        <Link href="/hr/bank" className="text-sm font-medium text-sky-700 hover:underline">
          ← Employee bank details
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{employee.name}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Bank account</CardTitle>
        </CardHeader>
        <CardContent>
          <BankAccountForm userId={id} existing={existing} />
        </CardContent>
      </Card>
    </div>
  );
}
