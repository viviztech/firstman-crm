"use client";

import { useActionState } from "react";
import {
  addPayrollAdjustmentAction,
  addSalaryStructureLineAction,
  approvePayrollAction,
  assignSalaryStructureAction,
  calculatePayrollAction,
  createPayrollPeriodAction,
  createSalaryComponentAction,
  createSalaryStructureAction,
  markPayrollPaidAction,
  postPayrollAction,
} from "@/actions/hr-payroll";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Option = { id: string; name: string };
function Feedback({ state }: { state: { ok: boolean; error?: string } | undefined }) {
  return state ? (
    <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-destructive"}`}>
      {state.ok ? "Saved successfully." : state.error}
    </p>
  ) : null;
}
function Select({ name, label, options }: { name: string; label: string; options: Option[] }) {
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
          <option value={option.id} key={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function PayrollPeriodForm() {
  const [state, action, pending] = useActionState(createPayrollPeriodAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="payrollMonth">Payroll month</Label>
        <Input id="payrollMonth" name="month" type="month" required />
      </div>
      <Button disabled={pending}>{pending ? "Creating..." : "Create period"}</Button>
      <Feedback state={state} />
    </form>
  );
}
export function SalaryComponentForm() {
  const [state, action, pending] = useActionState(createSalaryComponentAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="componentCode">Code</Label>
          <Input id="componentCode" name="code" required />
        </div>
        <div>
          <Label htmlFor="componentName">Name</Label>
          <Input id="componentName" name="name" required />
        </div>
        <div>
          <Label htmlFor="componentType">Type</Label>
          <select
            id="componentType"
            name="type"
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="earning">Earning</option>
            <option value="deduction">Deduction</option>
            <option value="reimbursement">Reimbursement</option>
            <option value="employer_contribution">Employer contribution</option>
          </select>
        </div>
        <div>
          <Label htmlFor="calculationMode">Calculation</Label>
          <select
            id="calculationMode"
            name="calculationMode"
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="fixed">Fixed monthly</option>
            <option value="percent_of_basic">Percent of BASIC</option>
          </select>
        </div>
        <div>
          <Label htmlFor="displayOrder">Display order</Label>
          <Input id="displayOrder" name="displayOrder" type="number" defaultValue="10" />
        </div>
        <div>
          <Label htmlFor="taxable">Taxable</Label>
          <select
            id="taxable"
            name="taxable"
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
      </div>
      <Feedback state={state} />
      <Button disabled={pending}>Create component</Button>
    </form>
  );
}
export function SalaryStructureForm() {
  const [state, action, pending] = useActionState(createSalaryStructureAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="structureCode">Code</Label>
          <Input id="structureCode" name="code" required />
        </div>
        <div>
          <Label htmlFor="structureName">Name</Label>
          <Input id="structureName" name="name" required />
        </div>
      </div>
      <Feedback state={state} />
      <Button disabled={pending}>Create structure</Button>
    </form>
  );
}
export function SalaryLineForm({
  structures,
  components,
}: {
  structures: Option[];
  components: Option[];
}) {
  const [state, action, pending] = useActionState(addSalaryStructureLineAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select name="structureId" label="Structure" options={structures} />
        <Select name="componentId" label="Component" options={components} />
        <div>
          <Label htmlFor="amountRupees">Fixed monthly amount (Rs.)</Label>
          <Input id="amountRupees" name="amountRupees" type="number" min="0" step="0.01" />
        </div>
        <div>
          <Label htmlFor="ratePercent">Percent of BASIC</Label>
          <Input id="ratePercent" name="ratePercent" type="number" min="0" step="0.01" />
        </div>
      </div>
      <Feedback state={state} />
      <Button disabled={pending}>Save structure line</Button>
    </form>
  );
}
export function SalaryAssignmentForm({
  employees,
  structures,
}: {
  employees: Option[];
  structures: Option[];
}) {
  const [state, action, pending] = useActionState(assignSalaryStructureAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select name="employeeUserId" label="Employee" options={employees} />
        <Select name="structureId" label="Structure" options={structures} />
        <div>
          <Label htmlFor="salaryFrom">Effective from</Label>
          <Input id="salaryFrom" name="effectiveFrom" type="date" required />
        </div>
        <div>
          <Label htmlFor="salaryTo">Effective to</Label>
          <Input id="salaryTo" name="effectiveTo" type="date" />
        </div>
      </div>
      <Feedback state={state} />
      <Button disabled={pending}>Assign salary</Button>
    </form>
  );
}
export function PayrollAdjustmentForm({
  periodId,
  employees,
  components,
}: {
  periodId: string;
  employees: Option[];
  components: Option[];
}) {
  const [state, action, pending] = useActionState(addPayrollAdjustmentAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="periodId" value={periodId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select name="employeeUserId" label="Employee" options={employees} />
        <Select name="componentId" label="Component" options={components} />
        <div>
          <Label htmlFor="adjustmentAmount">Amount (Rs.)</Label>
          <Input id="adjustmentAmount" name="amountRupees" type="number" step="0.01" required />
        </div>
        <div>
          <Label htmlFor="adjustmentReason">Reason</Label>
          <Input id="adjustmentReason" name="reason" required />
        </div>
      </div>
      <Feedback state={state} />
      <Button disabled={pending}>Add adjustment</Button>
    </form>
  );
}
export function PayrollTransitionButton({
  periodId,
  transition,
}: {
  periodId: string;
  transition: "calculate" | "approve" | "post" | "paid";
}) {
  const fn =
    transition === "calculate"
      ? calculatePayrollAction
      : transition === "approve"
        ? approvePayrollAction
        : transition === "post"
          ? postPayrollAction
          : markPayrollPaidAction;
  const [state, action, pending] = useActionState(fn.bind(null, periodId), undefined);
  return (
    <form action={action} className="space-y-1">
      <Button disabled={pending} variant={transition === "approve" ? "default" : "outline"}>
        {pending
          ? "Working..."
          : transition === "paid"
            ? "Mark paid"
            : `${transition[0]?.toUpperCase()}${transition.slice(1)} payroll`}
      </Button>
      <Feedback state={state} />
    </form>
  );
}
