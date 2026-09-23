"use client";

import { useActionState, useState } from "react";
import { transitionEmployeeStatusAction } from "@/actions/hr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TransitionTarget = "active" | "probation" | "notice" | "exited";

const LABELS: Record<TransitionTarget, string> = {
  active: "Active",
  probation: "Probation",
  notice: "Notice period",
  exited: "Exited",
};

export function EmploymentLifecycleForm({
  userId,
  currentStatus,
  transitions,
}: {
  userId: string;
  currentStatus: string;
  transitions: TransitionTarget[];
}) {
  const [target, setTarget] = useState<TransitionTarget | "">(transitions[0] ?? "");
  const [result, action, pending] = useActionState(
    transitionEmployeeStatusAction.bind(null, userId),
    undefined,
  );

  if (transitions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No further status changes are available.</p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Current status: <span className="font-medium text-foreground">{currentStatus}</span>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="toStatus">New status</Label>
          <select
            id="toStatus"
            name="toStatus"
            value={target}
            onChange={(event) => setTarget(event.target.value as TransitionTarget)}
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            {transitions.map((status) => (
              <option key={status} value={status}>
                {LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="effectiveDate">Effective date</Label>
          <Input id="effectiveDate" name="effectiveDate" type="date" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="transitionReason">Reason</Label>
        <Textarea id="transitionReason" name="reason" required minLength={5} maxLength={500} />
      </div>
      {target === "exited" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">Exit immediately disables this account.</p>
          <p className="mt-1">
            Reassign open work first. This action revokes every session and removes HR access.
          </p>
          <label className="mt-3 flex items-start gap-2">
            <input type="checkbox" name="confirmExit" value="yes" required className="mt-1" />
            <span>I understand this employee will lose access immediately.</span>
          </label>
        </div>
      ) : null}
      {result && !result.ok ? <p className="text-sm text-destructive">{result.error}</p> : null}
      {result?.ok ? <p className="text-sm text-emerald-700">Employment status updated.</p> : null}
      <Button
        type="submit"
        variant={target === "exited" ? "destructive" : "default"}
        disabled={pending}
      >
        {pending ? "Updating…" : target === "exited" ? "Exit employee" : "Update status"}
      </Button>
    </form>
  );
}
