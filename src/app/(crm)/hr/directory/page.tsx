import { UsersRoundIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { listEmployeeDirectory } from "@/services/hr";

export default async function EmployeeDirectoryPage() {
  await requireUser();
  const employees = await listEmployeeDirectory();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold tracking-widest text-sky-700 uppercase">
          HR / Directory
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Employee directory</h1>
        <p className="mt-2 text-sm text-muted-foreground">Public workplace details only.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {employees.map((employee) => (
          <Card key={employee.userId}>
            <CardHeader className="flex-row items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700">
                <UsersRoundIcon className="size-5" />
              </span>
              <div className="min-w-0">
                <CardTitle className="truncate">{employee.name}</CardTitle>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {employee.designationName ?? employee.role?.replace("_", " ")}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                {employee.departmentName ?? "Department not assigned"}
              </p>
              <div className="flex flex-wrap gap-2">
                {employee.team ? <Badge variant="secondary">{employee.team}</Badge> : null}
                {employee.locationName ? (
                  <Badge variant="outline">{employee.locationName}</Badge>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
