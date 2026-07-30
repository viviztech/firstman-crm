"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateLeadAutoAssignmentAction } from "@/actions/settings";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function LeadAutoAssignmentToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  function handleChange(checked: boolean) {
    setEnabled(checked);
    startTransition(async () => {
      const result = await updateLeadAutoAssignmentAction(checked);
      if (!result.ok) {
        setEnabled(!checked);
        toast.error(result.error);
        return;
      }
      toast.success(
        checked ? "Round-robin auto-assignment enabled" : "Round-robin auto-assignment disabled",
      );
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id="leadAutoAssignment"
        checked={enabled}
        onCheckedChange={(checked) => handleChange(checked === true)}
        disabled={isPending}
      />
      <Label htmlFor="leadAutoAssignment">Auto-assign new leads round-robin among executives</Label>
    </div>
  );
}
