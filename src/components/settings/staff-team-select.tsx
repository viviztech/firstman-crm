"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateStaffTeamAction } from "@/actions/staff";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Role } from "@/lib/roles";
import type { StaffTeam } from "@/lib/scope";

const NONE = "none";

const EXECUTIVE_TEAMS: { value: string; label: string }[] = [
  { value: NONE, label: "Unset" },
  { value: "sales", label: "Sales" },
  { value: "operations", label: "Operations" },
];

const MANAGER_TEAMS: { value: string; label: string }[] = [
  { value: NONE, label: "Unset" },
  { value: "backoffice", label: "Backoffice Admin" },
  { value: "workforce", label: "Workforce Manager" },
  { value: "franchise", label: "Franchise Manager" },
];

export function StaffTeamSelect({
  userId,
  role,
  team,
  disabled,
}: {
  userId: string;
  role: Role;
  team: StaffTeam | null;
  disabled?: boolean;
}) {
  const TEAMS = role === "manager" ? MANAGER_TEAMS : EXECUTIVE_TEAMS;
  const [value, setValue] = useState<string>(team ?? NONE);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string | null) {
    if (!next) return;
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await updateStaffTeamAction(userId, next === NONE ? null : next);
      if (!result.ok) {
        setValue(previous);
        toast.error(result.error);
        return;
      }
      toast.success(`Team updated to ${next === NONE ? "unset" : next}`);
    });
  }

  return (
    <Select
      value={value}
      onValueChange={handleChange}
      disabled={disabled || isPending}
      items={TEAMS}
    >
      <SelectTrigger className="w-32" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TEAMS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
