import { addMonths, format, subMonths } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, UploadIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AttendanceEntryForm, RegularizationDecisionForm } from "@/components/hr/attendance-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { getHrCapabilities } from "@/services/hr";
import { listAttendanceTeam } from "@/services/hr-attendance";

export default async function TeamAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const actor = await requireUser();
  const capabilities = await getHrCapabilities(actor);
  const isHr = capabilities.includes("hr_admin");
  if (!isHr && actor.role !== "manager") redirect("/hr/attendance");
  const { month } = await searchParams;
  const selectedMonth =
    month && /^\d{4}-\d{2}$/.test(month) ? month : format(new Date(), "yyyy-MM");
  const attendance = await listAttendanceTeam(actor, selectedMonth);
  const anchor = new Date(`${attendance.month}-01T00:00:00`);
  const employeeOptions = attendance.employees.map((employee) => ({
    id: employee.id,
    name: `${employee.name}${employee.employeeCode ? ` · ${employee.employeeCode}` : ""}`,
  }));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team attendance</h1>
          <p className="text-sm text-muted-foreground">
            Monthly status summary, exceptions, corrections, and approvals.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={`/api/hr/attendance/export?month=${attendance.month}`} />}
          >
            <DownloadIcon />
            Export CSV
          </Button>
          {isHr ? (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/hr/attendance/import" />}
            >
              <UploadIcon />
              Import CSV
            </Button>
          ) : null}
        </div>
      </div>
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <p className="text-xl font-bold">{format(anchor, "MMMM yyyy")}</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  href={`/hr/attendance/team?month=${format(subMonths(anchor, 1), "yyyy-MM")}`}
                />
              }
            >
              <ChevronLeftIcon />
              Previous
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  href={`/hr/attendance/team?month=${format(addMonths(anchor, 1), "yyyy-MM")}`}
                />
              }
            >
              Next
              <ChevronRightIcon />
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Monthly summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {attendance.summary.map((employee) => (
              <div
                key={employee.id}
                className="grid gap-2 py-3 text-sm md:grid-cols-[1fr_repeat(5,minmax(70px,auto))]"
              >
                <span className="font-medium">{employee.name}</span>
                <span>Present {employee.counts.present ?? 0}</span>
                <span>Half {employee.counts.half_day ?? 0}</span>
                <span>
                  Leave {(employee.counts.leave ?? 0) + (employee.counts.half_day_leave ?? 0)}
                </span>
                <span>Absent {employee.counts.absent ?? 0}</span>
                <span>Exceptions {employee.counts.missing_punch ?? 0}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {isHr ? (
        <Card>
          <CardHeader>
            <CardTitle>Manual attendance entry</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceEntryForm employees={employeeOptions} />
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Pending regularizations</CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.regularizations.length ? (
            <div className="divide-y">
              {attendance.regularizations.map((request) => (
                <div key={request.id} className="space-y-3 py-4">
                  <div>
                    <p className="font-medium">
                      {request.employeeName} · {request.workDate}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Requested: {request.requestedStatus.replaceAll("_", " ")} · {request.reason}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <RegularizationDecisionForm requestId={request.id} decision="approved" />
                    <RegularizationDecisionForm requestId={request.id} decision="rejected" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No requests awaiting your decision.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Exceptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {attendance.summary.flatMap((employee) =>
              employee.records
                .filter((record) => ["absent", "missing_punch"].includes(record.status))
                .map((record) => (
                  <Badge key={`${employee.id}-${record.workDate}`} variant="outline">
                    {employee.name} · {record.workDate} · {record.status.replaceAll("_", " ")}
                  </Badge>
                )),
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
