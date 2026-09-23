import { PencilIcon, UsersRoundIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CapabilityButtons } from "@/components/hr/capability-buttons";
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
import { requireUser } from "@/lib/session";
import { getHrCapabilities, listCapabilityAssignments, listEmployeesForHr } from "@/services/hr";

export default async function HrEmployeesPage() {
  const actor = await requireUser();
  const capabilities = await getHrCapabilities(actor);
  if (!capabilities.includes("hr_admin")) redirect("/hr");

  const [employees, assignments] = await Promise.all([
    listEmployeesForHr(actor),
    listCapabilityAssignments(actor),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
          <UsersRoundIcon />
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Employment records and HR access assignments.
          </p>
        </div>
        <Button variant="outline" render={<Link href="/hr/employees/import" />}>
          Import CSV
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Employee roster</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                {actor.role === "super_admin" ? <TableHead>HR capabilities</TableHead> : null}
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.userId}>
                  <TableCell>
                    <p className="font-medium">{employee.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {employee.employeeCode ?? "No employee code"} · {employee.email}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p>{employee.departmentName ?? "Not assigned"}</p>
                    <p className="text-xs text-muted-foreground">
                      {employee.designationName ?? employee.team ?? "—"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={employee.employmentStatus === "exited" ? "outline" : "secondary"}
                    >
                      {employee.employmentStatus ?? "profile pending"}
                    </Badge>
                  </TableCell>
                  {actor.role === "super_admin" ? (
                    <TableCell>
                      <CapabilityButtons
                        userId={employee.userId}
                        initialCapabilities={assignments.get(employee.userId) ?? []}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href={`/hr/employees/${employee.userId}`} />}
                    >
                      <PencilIcon /> Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
