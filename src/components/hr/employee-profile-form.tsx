"use client";

import { useActionState } from "react";
import { updateEmployeeProfileAction } from "@/actions/hr";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = { id: string; name: string; code?: string };

type Employee = {
  userId: string;
  name: string;
  email: string;
  employeeCode: string | null;
  legalName: string | null;
  phone: string | null;
  personalEmail: string | null;
  departmentId: string | null;
  designationId: string | null;
  managerUserId: string | null;
  workLocationId: string | null;
  employmentStatus: string | null;
  employmentCategory: string | null;
  joinDate: string | null;
  confirmationDate: string | null;
  noticeStartDate: string | null;
  lastWorkingDate: string | null;
  payrollEligible: boolean | null;
};

export function EmployeeProfileForm({
  employee,
  departments,
  designations,
  locations,
  managers,
}: {
  employee: Employee;
  departments: Option[];
  designations: Option[];
  locations: Option[];
  managers: Array<{ userId: string; name: string }>;
}) {
  const action = updateEmployeeProfileAction.bind(null, employee.userId);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Employee code" name="employeeCode" required value={employee.employeeCode} />
        <Field label="Legal name" name="legalName" value={employee.legalName} />
        <Field label="Phone" name="phone" value={employee.phone} type="tel" />
        <Field
          label="Personal email"
          name="personalEmail"
          value={employee.personalEmail}
          type="email"
        />
        <SelectField
          label="Department"
          name="departmentId"
          value={employee.departmentId}
          options={departments}
        />
        <SelectField
          label="Designation"
          name="designationId"
          value={employee.designationId}
          options={designations}
        />
        <SelectField
          label="Work location"
          name="workLocationId"
          value={employee.workLocationId}
          options={locations}
        />
        <SelectField
          label="Reporting manager"
          name="managerUserId"
          value={employee.managerUserId}
          options={managers
            .filter((manager) => manager.userId !== employee.userId)
            .map((manager) => ({ id: manager.userId, name: manager.name }))}
        />
        <input type="hidden" name="employmentStatus" value={employee.employmentStatus ?? "draft"} />
        <SelectField
          label="Employment category"
          name="employmentCategory"
          value={employee.employmentCategory}
          options={[
            { id: "permanent", name: "Permanent" },
            { id: "probationer", name: "Probationer" },
            { id: "contract", name: "Contract" },
            { id: "intern", name: "Intern" },
            { id: "consultant", name: "Consultant" },
          ]}
        />
        <Field label="Join date" name="joinDate" value={employee.joinDate} type="date" />
      </div>
      <div className="flex items-center gap-3 rounded-xl border bg-slate-50 p-4">
        <Checkbox
          id="payrollEligible"
          name="payrollEligible"
          value="true"
          defaultChecked={employee.payrollEligible ?? false}
        />
        <Label htmlFor="payrollEligible">Eligible for payroll</Label>
      </div>
      {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.ok ? <p className="text-sm text-emerald-700">Employee profile saved.</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save employee profile"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  value,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  value: string | null;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={value ?? ""} required={required} />
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  options,
  allowEmpty = true,
}: {
  label: string;
  name: string;
  value: string | null;
  options: Option[];
  allowEmpty?: boolean;
}) {
  const items = allowEmpty ? [{ id: "none", name: "Not set" }, ...options] : options;
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Select
        name={name}
        defaultValue={value ?? (allowEmpty ? "none" : options[0]?.id)}
        items={items.map((item) => ({ value: item.id, label: item.name }))}
      >
        <SelectTrigger id={name} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
