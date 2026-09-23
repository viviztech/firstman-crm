"use client";

import { useActionState } from "react";
import {
  assignShiftAction,
  createRegularizationAction,
  createShiftAction,
  decideRegularizationAction,
  lockAttendancePeriodAction,
  saveAttendanceEntryAction,
} from "@/actions/hr-attendance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Option = { id: string; name: string };

function Feedback({ state }: { state: { ok: boolean; error?: string } | undefined }) {
  if (!state) return null;
  return (
    <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-destructive"}`}>
      {state.ok ? "Saved successfully." : state.error}
    </p>
  );
}

function SelectField({ name, label, options }: { name: string; label: string; options: Option[] }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        required
        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatusField({ name = "status" }: { name?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>Requested status</Label>
      <select
        id={name}
        name={name}
        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
      >
        <option value="present">Present</option>
        <option value="half_day">Half day</option>
        <option value="absent">Absent</option>
        <option value="missing_punch">Missing punch</option>
      </select>
    </div>
  );
}

export function AttendanceEntryForm({ employees }: { employees: Option[] }) {
  const [state, action, pending] = useActionState(saveAttendanceEntryAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SelectField name="employeeUserId" label="Employee" options={employees} />
        <div className="space-y-2">
          <Label htmlFor="workDate">Work date</Label>
          <Input id="workDate" name="workDate" type="date" required />
        </div>
        <StatusField />
        <div className="space-y-2">
          <Label htmlFor="firstIn">First in</Label>
          <Input id="firstIn" name="firstIn" type="datetime-local" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastOut">Last out</Label>
          <Input id="lastOut" name="lastOut" type="datetime-local" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="attendanceNote">Note</Label>
          <Input id="attendanceNote" name="note" />
        </div>
      </div>
      <Feedback state={state} />
      <Button disabled={pending}>{pending ? "Saving…" : "Save attendance"}</Button>
    </form>
  );
}

export function RegularizationForm() {
  const [state, action, pending] = useActionState(createRegularizationAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="regularizationDate">Work date</Label>
          <Input id="regularizationDate" name="workDate" type="date" required />
        </div>
        <StatusField name="requestedStatus" />
        <div className="space-y-2">
          <Label htmlFor="requestedFirstIn">Requested first in</Label>
          <Input id="requestedFirstIn" name="requestedFirstIn" type="datetime-local" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="requestedLastOut">Requested last out</Label>
          <Input id="requestedLastOut" name="requestedLastOut" type="datetime-local" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="regularizationReason">Reason</Label>
        <Input id="regularizationReason" name="reason" required />
      </div>
      <Feedback state={state} />
      <Button disabled={pending}>{pending ? "Submitting…" : "Request regularization"}</Button>
    </form>
  );
}

export function RegularizationDecisionForm({
  requestId,
  decision,
}: {
  requestId: string;
  decision: "approved" | "rejected";
}) {
  const [state, action, pending] = useActionState(
    decideRegularizationAction.bind(null, requestId, decision),
    undefined,
  );
  return (
    <form action={action} className="flex items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor={`${decision}-${requestId}`} className="sr-only">
          Decision note
        </Label>
        <Input id={`${decision}-${requestId}`} name="note" placeholder="Optional note" />
      </div>
      <Button
        size="sm"
        variant={decision === "approved" ? "default" : "outline"}
        disabled={pending}
      >
        {pending ? "Saving…" : decision === "approved" ? "Approve" : "Reject"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function ShiftForm() {
  const [state, action, pending] = useActionState(createShiftAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="shiftCode">Code</Label>
          <Input id="shiftCode" name="code" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shiftName">Name</Label>
          <Input id="shiftName" name="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startTime">Start time</Label>
          <Input id="startTime" name="startTime" type="time" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">End time</Label>
          <Input id="endTime" name="endTime" type="time" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="breakMinutes">Unpaid break minutes</Label>
          <Input
            id="breakMinutes"
            name="breakMinutes"
            type="number"
            defaultValue="60"
            min="0"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fullDayMinutes">Full-day minimum</Label>
          <Input
            id="fullDayMinutes"
            name="fullDayMinutes"
            type="number"
            defaultValue="480"
            min="1"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="halfDayMinutes">Half-day minimum</Label>
          <Input
            id="halfDayMinutes"
            name="halfDayMinutes"
            type="number"
            defaultValue="240"
            min="1"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="crossesMidnight">Shift pattern</Label>
          <select
            id="crossesMidnight"
            name="crossesMidnight"
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="false">Same day</option>
            <option value="true">Overnight</option>
          </select>
        </div>
      </div>
      <Feedback state={state} />
      <Button disabled={pending}>{pending ? "Saving…" : "Create shift"}</Button>
    </form>
  );
}

export function ShiftAssignmentForm({
  employees,
  shifts,
}: {
  employees: Option[];
  shifts: Option[];
}) {
  const [state, action, pending] = useActionState(assignShiftAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField name="employeeUserId" label="Employee" options={employees} />
        <SelectField name="shiftId" label="Shift" options={shifts} />
        <div className="space-y-2">
          <Label htmlFor="shiftEffectiveFrom">Effective from</Label>
          <Input id="shiftEffectiveFrom" name="effectiveFrom" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shiftEffectiveTo">Effective to</Label>
          <Input id="shiftEffectiveTo" name="effectiveTo" type="date" />
        </div>
      </div>
      <Feedback state={state} />
      <Button disabled={pending}>{pending ? "Assigning…" : "Assign shift"}</Button>
    </form>
  );
}

export function AttendanceLockForm() {
  const [state, action, pending] = useActionState(lockAttendancePeriodAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="periodStart">Period start</Label>
          <Input id="periodStart" name="periodStart" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="periodEnd">Period end</Label>
          <Input id="periodEnd" name="periodEnd" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lockReason">Lock reason</Label>
          <Input id="lockReason" name="reason" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payrollPeriodReference">Payroll reference</Label>
          <Input id="payrollPeriodReference" name="payrollPeriodReference" />
        </div>
      </div>
      <Feedback state={state} />
      <Button variant="destructive" disabled={pending}>
        {pending ? "Locking…" : "Lock attendance period"}
      </Button>
    </form>
  );
}
