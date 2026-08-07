"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { paiseToRupees, rupeesToPaise } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * A rupee-denominated number input that submits integer paise under `name` via a hidden
 * field — staff type/read amounts as rupees (spec §2's user-facing unit), storage and the
 * server action's Zod schema stay in paise, unchanged. Internal state is the rupee string
 * (uncontrolled from the parent's perspective); to reset it to a new default — e.g. when a
 * service picker changes and should re-populate the price — remount via a `key` prop rather
 * than pushing a new `defaultValuePaise`, since a live-controlled round trip through paise
 * would reformat the field (and drop a trailing ".") on every keystroke.
 */
export function MoneyInput({
  id,
  name,
  defaultValuePaise,
  required,
  min = 0,
  className,
  placeholder,
}: {
  id?: string;
  name: string;
  defaultValuePaise?: number | string | null;
  required?: boolean;
  min?: number;
  className?: string;
  placeholder?: string;
}) {
  const [rupees, setRupees] = useState(() => paiseToRupees(defaultValuePaise));

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        ₹
      </span>
      <Input
        id={id}
        type="number"
        min={min}
        step="0.01"
        inputMode="decimal"
        required={required}
        placeholder={placeholder}
        value={rupees}
        onChange={(event) => setRupees(event.target.value)}
        className={cn("pl-6", className)}
      />
      <input type="hidden" name={name} value={rupeesToPaise(rupees)} />
    </div>
  );
}
