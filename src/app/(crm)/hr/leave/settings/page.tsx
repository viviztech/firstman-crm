import { redirect } from "next/navigation";
import {
  HolidayForm,
  LeaveAdjustmentForm,
  LeavePolicyForm,
  LeaveProvisioningForm,
  LeaveTypeForm,
} from "@/components/hr/leave-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { getHrCapabilities } from "@/services/hr";
import { listLeaveSettings } from "@/services/hr-leave";

export default async function LeaveSettingsPage() {
  const actor = await requireUser();
  if (!(await getHrCapabilities(actor)).includes("hr_admin")) redirect("/hr/leave");
  const settings = await listLeaveSettings(actor);
  const typeOptions = settings.types
    .filter((type) => type.isActive)
    .map((type) => ({ id: type.id, name: type.name }));
  const employeeOptions = settings.employees.map((employee) => ({
    id: employee.id,
    name: `${employee.name}${employee.employeeCode ? ` · ${employee.employeeCode}` : ""}`,
  }));
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leave settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure leave types, immutable balance adjustments, and location holidays.
        </p>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leave types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <LeaveTypeForm />
            <div className="flex flex-wrap gap-2 border-t pt-4">
              {settings.types.map((type) => (
                <Badge key={type.id} variant="secondary">
                  {type.name} · {type.isPaid ? "paid" : "unpaid"}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Balance adjustment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Every credit or correction is appended to the ledger; existing entries are never
              overwritten.
            </p>
            <LeaveAdjustmentForm
              employees={employeeOptions}
              leaveTypes={typeOptions}
              year={new Date().getFullYear()}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Entitlement policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Annual entitlement is prorated by policy dates and the employee join or last-working
              date, then posted to the immutable ledger.
            </p>
            <LeavePolicyForm employees={employeeOptions} leaveTypes={typeOptions} />
            <div className="space-y-2 border-t pt-4">
              {settings.policyAssignments.length ? (
                settings.policyAssignments.map((policy) => (
                  <div key={policy.id} className="rounded-lg border px-3 py-2 text-sm">
                    <span className="font-medium">
                      {policy.employeeName} · {policy.leaveTypeName}
                    </span>
                    <span className="block text-muted-foreground">
                      {policy.annualEntitlementHalfDays / 2} days/year · {policy.effectiveFrom}
                      {policy.effectiveTo ? ` to ${policy.effectiveTo}` : " onward"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No policies assigned yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Automated provisioning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A daily idempotent job reconciles prorated entitlements and capped carry-forward. Run
              it manually after correcting historical policy or employment dates.
            </p>
            <LeaveProvisioningForm year={new Date().getFullYear()} />
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Location holidays</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <HolidayForm locations={settings.locations} />
            <div className="space-y-2">
              {settings.holidays.length ? (
                settings.holidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className="flex justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <span>
                      {holiday.name} · {holiday.locationName}
                    </span>
                    <span className="text-muted-foreground">{holiday.holidayDate}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No holidays configured.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
