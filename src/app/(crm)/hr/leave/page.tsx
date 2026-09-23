import { CalendarDaysIcon, Settings2Icon, UsersRoundIcon } from "lucide-react";
import Link from "next/link";
import { cancelLeaveRequestAction } from "@/actions/hr-leave";
import { LeaveRequestForm } from "@/components/hr/leave-forms";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { getHrCapabilities } from "@/services/hr";
import { listMyLeave } from "@/services/hr-leave";

function days(halfDays: number) {
  return `${halfDays / 2} ${halfDays === 2 ? "day" : "days"}`;
}

export default async function LeavePage() {
  const actor = await requireUser();
  const [leave, capabilities] = await Promise.all([
    listMyLeave(actor.id),
    getHrCapabilities(actor),
  ]);
  const canManage = capabilities.includes("hr_admin");
  const canApprove = canManage || actor.role === "manager";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <CalendarDaysIcon />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My leave</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Balances use the calendar year. Saturdays, Sundays, and configured holidays are
              excluded.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canApprove ? (
            <Link href="/hr/leave/team" className={buttonVariants({ variant: "outline" })}>
              <UsersRoundIcon />
              Team approvals
            </Link>
          ) : null}
          {canManage ? (
            <Link href="/hr/leave/settings" className={buttonVariants({ variant: "outline" })}>
              <Settings2Icon />
              Settings
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {leave.balances.length ? (
          leave.balances.map((balance) => (
            <Card key={balance.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{balance.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {balance.isPaid ? days(balance.halfDays) : "No limit"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {balance.isPaid
                    ? `${days(balance.pendingHalfDays)} pending`
                    : "Unpaid · balance not required"}{" "}
                  · {balance.code}
                </p>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="sm:col-span-2">
            <CardContent className="pt-6 text-sm text-muted-foreground">
              No leave types are configured yet. Ask HR to create a leave type and credit your
              opening balance.
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request leave</CardTitle>
        </CardHeader>
        <CardContent>
          <LeaveRequestForm
            leaveTypes={leave.types.map((type) => ({ id: type.id, name: type.name }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request history</CardTitle>
        </CardHeader>
        <CardContent>
          {leave.requests.length ? (
            <div className="divide-y">
              {leave.requests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div>
                    <p className="font-medium">
                      {request.leaveTypeName} · {days(request.requestedHalfDays)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {request.startDate}
                      {request.endDate !== request.startDate ? ` to ${request.endDate}` : ""} ·{" "}
                      {request.reason}
                    </p>
                    {request.decisionNote ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Decision note: {request.decisionNote}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{request.status}</Badge>
                    {request.status === "pending" || request.status === "approved" ? (
                      <form action={cancelLeaveRequestAction.bind(null, request.id)}>
                        <Button size="sm" variant="ghost">
                          Cancel
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No leave requests yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
