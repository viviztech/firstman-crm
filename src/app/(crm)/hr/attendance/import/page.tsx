import Link from "next/link";
import { redirect } from "next/navigation";
import { AttendanceImportForm } from "@/components/hr/attendance-import-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { getHrCapabilities } from "@/services/hr";

export default async function AttendanceImportPage() {
  const actor = await requireUser();
  if (!(await getHrCapabilities(actor)).includes("hr_admin")) redirect("/hr/attendance");
  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/hr/attendance/team"
          className="text-sm font-medium text-sky-700 hover:underline"
        >
          ← Team attendance
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Import attendance</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Validate, preview, and commit CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceImportForm />
        </CardContent>
      </Card>
    </div>
  );
}
