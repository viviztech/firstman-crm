import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LeaveDecisionForm } from "@/components/hr/leave-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { getHrCapabilities } from "@/services/hr";
import { listLeaveApprovalQueue, listTeamLeaveCalendar } from "@/services/hr-leave";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function TeamLeavePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const actor = await requireUser();
  const capabilities = await getHrCapabilities(actor);
  if (actor.role !== "manager" && !capabilities.includes("hr_admin")) redirect("/hr/leave");
  const { month } = await searchParams;
  const requestedMonth =
    month && /^\d{4}-\d{2}$/.test(month) ? month : format(new Date(), "yyyy-MM");
  const [requests, calendar] = await Promise.all([
    listLeaveApprovalQueue(actor),
    listTeamLeaveCalendar(actor, requestedMonth),
  ]);
  const monthStart = startOfMonth(new Date(`${calendar.month}-01T00:00:00`));
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(monthEnd),
  });
  const eventsByDay = new Map<string, typeof calendar.rows>();
  for (const request of calendar.rows) {
    const first = request.startDate < calendar.start ? calendar.start : request.startDate;
    const last = request.endDate > calendar.end ? calendar.end : request.endDate;
    const cursor = new Date(`${first}T00:00:00Z`);
    const end = new Date(`${last}T00:00:00Z`);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      const events = eventsByDay.get(key);
      if (events) events.push(request);
      else eventsByDay.set(key, [request]);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  const previousMonth = format(subMonths(monthStart, 1), "yyyy-MM");
  const nextMonth = format(addMonths(monthStart, 1), "yyyy-MM");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team leave approvals</h1>
        <p className="text-sm text-muted-foreground">
          Managers see direct reports. HR administrators can decide any pending request.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pending requests</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length ? (
            <div className="divide-y">
              {requests.map((request) => (
                <div key={request.id} className="space-y-3 py-4">
                  <div>
                    <p className="font-medium">
                      {request.employeeName} · {request.leaveTypeName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {request.startDate}
                      {request.endDate !== request.startDate ? ` to ${request.endDate}` : ""} ·{" "}
                      {request.requestedHalfDays / 2} days
                    </p>
                    <p className="mt-1 text-sm">{request.reason}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <LeaveDecisionForm requestId={request.id} decision="approved" />
                    <LeaveDecisionForm requestId={request.id} decision="rejected" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No requests are waiting for your decision.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDaysIcon className="size-5" />
              {format(monthStart, "MMMM yyyy")}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Approved and pending leave for the team you are allowed to manage.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/hr/leave/team?month=${previousMonth}`} />}
            >
              <ChevronLeftIcon />
              Previous
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/hr/leave/team?month=${nextMonth}`} />}
            >
              Next
              <ChevronRightIcon />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-w-full overflow-x-auto rounded-xl border">
            <div className="grid min-w-[760px] grid-cols-7 gap-px bg-border text-sm">
              {WEEKDAYS.map((weekday) => (
                <div key={weekday} className="bg-muted px-2 py-2 text-center text-xs font-semibold">
                  {weekday}
                </div>
              ))}
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const events = eventsByDay.get(key) ?? [];
                return (
                  <div
                    key={key}
                    className={`min-h-28 bg-background p-2 ${isSameMonth(day, monthStart) ? "" : "opacity-40"}`}
                  >
                    <span className="text-xs text-muted-foreground">{format(day, "d")}</span>
                    <div className="mt-1 space-y-1">
                      {events.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-md border bg-sky-50 px-1.5 py-1 text-xs text-sky-900"
                        >
                          <p className="truncate font-medium">{event.employeeName}</p>
                          <p className="truncate">{event.leaveTypeName}</p>
                          <Badge variant="outline" className="mt-1 text-[10px]">
                            {event.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
