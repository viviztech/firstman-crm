import { redirect } from "next/navigation";
import {
  AttendanceLockForm,
  ShiftAssignmentForm,
  ShiftForm,
} from "@/components/hr/attendance-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { getHrCapabilities } from "@/services/hr";
import { listAttendanceSettings } from "@/services/hr-attendance";

export default async function AttendanceSettingsPage() {
  const actor = await requireUser();
  if (!(await getHrCapabilities(actor)).includes("hr_admin")) redirect("/hr/attendance");
  const settings = await listAttendanceSettings(actor);
  const employees = settings.employees.map((employee) => ({
    id: employee.id,
    name: `${employee.name}${employee.employeeCode ? ` · ${employee.employeeCode}` : ""}`,
  }));
  const shiftOptions = settings.shifts
    .filter((shift) => shift.isActive)
    .map((shift) => ({ id: shift.id, name: shift.name }));
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Attendance settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure shifts, effective assignments, and payroll locks.
        </p>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Shifts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <ShiftForm />
            <div className="flex flex-wrap gap-2 border-t pt-4">
              {settings.shifts.map((shift) => (
                <Badge key={shift.id} variant="secondary">
                  {shift.name} · {shift.startTime.slice(0, 5)}–{shift.endTime.slice(0, 5)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Shift assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <ShiftAssignmentForm employees={employees} shifts={shiftOptions} />
            <div className="space-y-2 border-t pt-4">
              {settings.assignments.map((assignment) => (
                <div key={assignment.id} className="rounded-lg border px-3 py-2 text-sm">
                  <span className="font-medium">
                    {assignment.employeeName} · {assignment.shiftName}
                  </span>
                  <span className="block text-muted-foreground">
                    {assignment.effectiveFrom}
                    {assignment.effectiveTo ? ` to ${assignment.effectiveTo}` : " onward"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Payroll attendance lock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Locking is irreversible from this screen and prevents manual entry, CSV imports, and
              approved regularizations from altering the period.
            </p>
            <AttendanceLockForm />
            <div className="space-y-2 border-t pt-4">
              {settings.locks.map((lock) => (
                <div key={lock.id} className="rounded-lg border px-3 py-2 text-sm">
                  {lock.periodStart} to {lock.periodEnd} · {lock.reason}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
