import { addMonths, format, subMonths } from "date-fns";
import {
  CalendarCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Settings2Icon,
  UsersRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { RegularizationForm } from "@/components/hr/attendance-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { getHrCapabilities } from "@/services/hr";
import { listMyAttendance } from "@/services/hr-attendance";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const actor = await requireUser();
  const { month } = await searchParams;
  const selectedMonth =
    month && /^\d{4}-\d{2}$/.test(month) ? month : format(new Date(), "yyyy-MM");
  const [attendance, capabilities] = await Promise.all([
    listMyAttendance(actor.id, selectedMonth),
    getHrCapabilities(actor),
  ]);
  const anchor = new Date(`${attendance.month}-01T00:00:00`);
  const counts = new Map<string, number>();
  for (const record of attendance.records)
    counts.set(record.status, (counts.get(record.status) ?? 0) + 1);
  const canManage = capabilities.includes("hr_admin");
  const canViewTeam = canManage || actor.role === "manager";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <CalendarCheckIcon />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My attendance</h1>
            <p className="text-sm text-muted-foreground">
              Daily attendance, leave reconciliation, and correction requests.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canViewTeam ? (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/hr/attendance/team" />}
            >
              <UsersRoundIcon />
              Team attendance
            </Button>
          ) : null}
          {canManage ? (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/hr/attendance/settings" />}
            >
              <Settings2Icon />
              Settings
            </Button>
          ) : null}
        </div>
      </div>
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Attendance month
            </p>
            <p className="text-xl font-bold">{format(anchor, "MMMM yyyy")}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link href={`/hr/attendance?month=${format(subMonths(anchor, 1), "yyyy-MM")}`} />
              }
            >
              <ChevronLeftIcon />
              Previous
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link href={`/hr/attendance?month=${format(addMonths(anchor, 1), "yyyy-MM")}`} />
              }
            >
              Next
              <ChevronRightIcon />
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {["present", "half_day", "leave", "absent"].map((status) => (
          <Card key={status}>
            <CardContent className="pt-5">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {status.replace("_", " ")}
              </p>
              <p className="mt-1 text-2xl font-bold">{counts.get(status) ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Daily records</CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.records.length ? (
            <div className="max-h-[520px] divide-y overflow-y-auto">
              {attendance.records.map((record) => (
                <div
                  key={record.id}
                  className="grid gap-2 py-3 text-sm sm:grid-cols-[120px_1fr_1fr_auto]"
                >
                  <span className="font-medium">{record.workDate}</span>
                  <span>
                    {record.firstIn
                      ? record.firstIn.toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}{" "}
                    to{" "}
                    {record.lastOut
                      ? record.lastOut.toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </span>
                  <span>
                    {record.workMinutes} minutes · {record.source}
                  </span>
                  <Badge variant="outline">{record.status.replaceAll("_", " ")}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No attendance records for this month.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Request correction</CardTitle>
        </CardHeader>
        <CardContent>
          <RegularizationForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Regularization history</CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.requests.length ? (
            <div className="divide-y">
              {attendance.requests.map((request) => (
                <div key={request.id} className="flex justify-between gap-3 py-3 text-sm">
                  <span>
                    {request.workDate} · {request.reason}
                  </span>
                  <Badge variant="outline">{request.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No correction requests this month.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
