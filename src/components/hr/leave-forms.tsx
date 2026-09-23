"use client";

import { useActionState } from "react";
import {
  addLeaveAdjustmentAction,
  createHolidayAction,
  createLeavePolicyAction,
  createLeaveRequestAction,
  createLeaveTypeAction,
  decideLeaveRequestAction,
  runLeaveProvisioningAction,
} from "@/actions/hr-leave";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Option = { id: string; name: string };

function Feedback({ state }: { state: { ok: boolean; error?: string } | undefined }) {
  if (!state) return null;
  return state.ok ? (
    <p className="text-sm text-emerald-700">Saved successfully.</p>
  ) : (
    <p className="text-sm text-destructive">{state.error}</p>
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

export function LeaveRequestForm({ leaveTypes }: { leaveTypes: Option[] }) {
  const [state, action, pending] = useActionState(createLeaveRequestAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField name="leaveTypeId" label="Leave type" options={leaveTypes} />
        <div className="space-y-2">
          <Label htmlFor="dayPortion">Duration</Label>
          <select
            id="dayPortion"
            name="dayPortion"
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="full_day">Full day(s)</option>
            <option value="first_half">First half</option>
            <option value="second_half">Second half</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" name="startDate" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" name="endDate" type="date" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reason">Reason</Label>
        <textarea
          id="reason"
          name="reason"
          required
          rows={3}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <Feedback state={state} />
      <Button disabled={pending || leaveTypes.length === 0}>
        {pending ? "Submitting…" : "Submit request"}
      </Button>
    </form>
  );
}

export function LeaveDecisionForm({
  requestId,
  decision,
}: {
  requestId: string;
  decision: "approved" | "rejected";
}) {
  const [state, action, pending] = useActionState(
    decideLeaveRequestAction.bind(null, requestId, decision),
    undefined,
  );
  return (
    <form action={action} className="flex min-w-48 items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor={`${decision}-${requestId}`} className="sr-only">
          Decision note
        </Label>
        <Input id={`${decision}-${requestId}`} name="note" placeholder="Optional note" />
      </div>
      <Button
        type="submit"
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

export function LeaveTypeForm() {
  const [state, action, pending] = useActionState(createLeaveTypeAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="code">Code</Label>
          <Input id="code" name="code" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="isPaid">Pay treatment</Label>
          <select
            id="isPaid"
            name="isPaid"
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="true">Paid</option>
            <option value="false">Unpaid</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">Allowed duration</Label>
          <select
            id="unit"
            name="unit"
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="day">Full days only</option>
            <option value="half_day">Full or half days</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="allowCarryForward">Carry forward</Label>
          <select
            id="allowCarryForward"
            name="allowCarryForward"
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxCarryForwardDays">Maximum carry-forward days</Label>
          <Input
            id="maxCarryForwardDays"
            name="maxCarryForwardDays"
            type="number"
            min="0"
            step="0.5"
          />
        </div>
      </div>
      <Feedback state={state} />
      <Button disabled={pending}>{pending ? "Saving…" : "Create leave type"}</Button>
    </form>
  );
}

export function LeaveAdjustmentForm({
  employees,
  leaveTypes,
  year,
}: {
  employees: Option[];
  leaveTypes: Option[];
  year: number;
}) {
  const [state, action, pending] = useActionState(addLeaveAdjustmentAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField name="employeeUserId" label="Employee" options={employees} />
        <SelectField name="leaveTypeId" label="Leave type" options={leaveTypes} />
        <div className="space-y-2">
          <Label htmlFor="year">Balance year</Label>
          <Input id="year" name="year" type="number" defaultValue={year} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="days">Days (+ credit, − correction)</Label>
          <Input id="days" name="days" type="number" step="0.5" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="adjustmentNote">Audit note</Label>
        <Input id="adjustmentNote" name="note" required />
      </div>
      <Feedback state={state} />
      <Button disabled={pending}>{pending ? "Saving…" : "Post adjustment"}</Button>
    </form>
  );
}

export function HolidayForm({ locations }: { locations: Option[] }) {
  const [state, action, pending] = useActionState(createHolidayAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <SelectField name="workLocationId" label="Work location" options={locations} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="holidayDate">Date</Label>
          <Input id="holidayDate" name="holidayDate" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="holidayName">Holiday name</Label>
          <Input id="holidayName" name="name" required />
        </div>
      </div>
      <Feedback state={state} />
      <Button disabled={pending}>{pending ? "Saving…" : "Add holiday"}</Button>
    </form>
  );
}

export function LeavePolicyForm({
  employees,
  leaveTypes,
}: {
  employees: Option[];
  leaveTypes: Option[];
}) {
  const [state, action, pending] = useActionState(createLeavePolicyAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField name="employeeUserId" label="Employee" options={employees} />
        <SelectField name="leaveTypeId" label="Leave type" options={leaveTypes} />
        <div className="space-y-2">
          <Label htmlFor="effectiveFrom">Effective from</Label>
          <Input id="effectiveFrom" name="effectiveFrom" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="effectiveTo">Effective to (optional)</Label>
          <Input id="effectiveTo" name="effectiveTo" type="date" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="annualEntitlementDays">Annual entitlement in days</Label>
          <Input
            id="annualEntitlementDays"
            name="annualEntitlementDays"
            type="number"
            min="0.5"
            max="365"
            step="0.5"
            required
          />
        </div>
      </div>
      <Feedback state={state} />
      <Button disabled={pending}>{pending ? "Assigning…" : "Assign policy"}</Button>
    </form>
  );
}

export function LeaveProvisioningForm({ year }: { year: number }) {
  const [state, action, pending] = useActionState(runLeaveProvisioningAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="provisioningYear">Provisioning year</Label>
        <Input
          id="provisioningYear"
          name="year"
          type="number"
          defaultValue={year}
          min="2000"
          max="2200"
          required
        />
      </div>
      <Button disabled={pending}>{pending ? "Reconciling…" : "Reconcile balances"}</Button>
      <Feedback state={state} />
    </form>
  );
}
