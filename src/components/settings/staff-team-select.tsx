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
import type { StaffTeam } from "@/lib/scope";

const NONE = "none";

const TEAMS: { value: string; label: string }[] = [
  { value: NONE, label: "Unset" },
  { value: "sales", label: "Sales" },
  { value: "operations", label: "Operations" },
  { value: "backoffice", label: "Backoffice Admin" },
  { value: "workforce", label: "Workforce Manager" },
];

export function StaffTeamSelect({
  userId,
  team,
  disabled,
}: {
  userId: string;
  team: StaffTeam | null;
  disabled?: boolean;
}) {
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
