"use client";

import { useActionState } from "react";
import { rehireEmployeeAction } from "@/actions/hr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function RehireEmployeeForm({
  userId,
  previousJoinDate,
  lastWorkingDate,
  managers,
}: {
  userId: string;
  previousJoinDate: string | null;
  lastWorkingDate: string | null;
  managers: Array<{ userId: string; name: string }>;
}) {
  const [result, action, pending] = useActionState(
    rehireEmployeeAction.bind(null, userId),
    undefined,
  );
  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Previous period: {previousJoinDate ?? "Unknown"} to {lastWorkingDate ?? "Unknown"}. Rehire
        creates a new period and restores account access; prior history remains available.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rehireStatus">New status</Label>
          <select
            id="rehireStatus"
            name="toStatus"
            required
            defaultValue=""
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="" disabled>
              Select status
            </option>
            <option value="active">Active</option>
            <option value="probation">Probation</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rehireDate">New join date</Label>
          <Input
            id="rehireDate"
            name="effectiveDate"
            type="date"
            min={lastWorkingDate ?? undefined}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rehireManager">Reporting manager</Label>
          <select
            id="rehireManager"
            name="managerUserId"
            required
            defaultValue=""
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="" disabled>
              Select a manager or No manager
            </option>
            <option value="none">No manager</option>
            {managers
              .filter((manager) => manager.userId !== userId)
              .map((manager) => (
                <option key={manager.userId} value={manager.userId}>
                  {manager.name}
                </option>
              ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rehirePayroll">Payroll eligibility</Label>
          <select
            id="rehirePayroll"
            name="payrollEligible"
            required
            defaultValue=""
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="" disabled>
              Select eligibility
            </option>
            <option value="true">Eligible</option>
            <option value="false">Not eligible</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rehireReason">Reason</Label>
        <Textarea id="rehireReason" name="reason" required minLength={5} maxLength={500} />
      </div>
      <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
        <input type="checkbox" name="confirmRehire" value="yes" required className="mt-1" />
        <span>I confirm this employee should regain access to the app.</span>
      </label>
      {result && !result.ok ? <p className="text-sm text-destructive">{result.error}</p> : null}
      {result?.ok ? <p className="text-sm text-emerald-700">Employee rehired.</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Rehiring…" : "Rehire employee"}
      </Button>
    </form>
  );
}
