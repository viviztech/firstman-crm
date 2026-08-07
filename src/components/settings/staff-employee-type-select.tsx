"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateStaffEmployeeTypeAction } from "@/actions/staff";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EmployeeType } from "@/lib/scope";

const EMPLOYEE_TYPES: { value: EmployeeType; label: string }[] = [
  { value: "internal", label: "Internal" },
  { value: "franchise", label: "Franchise" },
];

export function StaffEmployeeTypeSelect({
  userId,
  employeeType,
  disabled,
}: {
  userId: string;
  employeeType: EmployeeType;
  disabled?: boolean;
}) {
  const [value, setValue] = useState<EmployeeType>(employeeType);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: EmployeeType | null) {
    if (!next) return;
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await updateStaffEmployeeTypeAction(userId, next);
      if (!result.ok) {
        setValue(previous);
        toast.error(result.error);
        return;
      }
      toast.success(`Employee type updated to ${next}`);
    });
  }

  return (
    <Select
      value={value}
      onValueChange={handleChange}
      disabled={disabled || isPending}
      items={EMPLOYEE_TYPES}
    >
      <SelectTrigger className="w-32" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {EMPLOYEE_TYPES.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
