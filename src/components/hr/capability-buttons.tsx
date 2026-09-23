"use client";

import { useState, useTransition } from "react";
import { setHrCapabilityAction } from "@/actions/hr";
import { Button } from "@/components/ui/button";
import type { HrCapability } from "@/services/hr";

export function CapabilityButtons({
  userId,
  initialCapabilities,
}: {
  userId: string;
  initialCapabilities: HrCapability[];
}) {
  const [capabilities, setCapabilities] = useState(new Set(initialCapabilities));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(capability: HrCapability) {
    const enabled = !capabilities.has(capability);
    setError(null);
    startTransition(async () => {
      const result = await setHrCapabilityAction(userId, capability, enabled);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCapabilities((current) => {
        const next = new Set(current);
        if (enabled) next.add(capability);
        else next.delete(capability);
        return next;
      });
    });
  }

  return (
    <div className="flex min-w-48 flex-col items-start gap-1.5">
      <div className="flex gap-2">
        {(["hr_admin", "payroll_admin"] as const).map((capability) => (
          <Button
            key={capability}
            type="button"
            size="xs"
            variant={capabilities.has(capability) ? "default" : "outline"}
            disabled={pending}
            onClick={() => toggle(capability)}
          >
            {capability === "hr_admin" ? "HR" : "Payroll"}
          </Button>
        ))}
      </div>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
