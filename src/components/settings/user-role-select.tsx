"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { changeUserRoleAction } from "@/actions/users";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLES, type Role } from "@/lib/roles";

export function UserRoleSelect({
  userId,
  role,
  disabled,
}: {
  userId: string;
  role: Role;
  disabled?: boolean;
}) {
  const [value, setValue] = useState<Role>(role);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: Role | null) {
    if (!next) return;
    const nextRole = next;
    const previous = value;
    setValue(nextRole);
    startTransition(async () => {
      const result = await changeUserRoleAction(userId, nextRole);
      if (!result.ok) {
        setValue(previous);
        toast.error(result.error);
        return;
      }
      toast.success(`Role updated to ${nextRole.replace("_", " ")}`);
    });
  }

  return (
    <Select
      value={value}
      onValueChange={handleChange}
      disabled={disabled || isPending}
      items={ROLES.map((r) => ({ value: r, label: r.replace("_", " ") }))}
    >
      <SelectTrigger className="w-40" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {r.replace("_", " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
