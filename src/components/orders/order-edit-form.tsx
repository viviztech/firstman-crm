"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import type { ActionResult } from "@/actions/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Role } from "@/lib/auth";

type StaffOption = { id: string; name: string };

export function OrderEditForm({
  action,
  role,
  staff,
  orderId,
  defaultValues,
}: {
  action: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  role: Role;
  staff: StaffOption[];
  orderId: string;
  defaultValues: {
    quotedPricePaise: number;
    govtFeePaise: number | null;
    assignedTo: string | null;
    notes: string | null;
  };
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.ok) {
      router.push(`/orders/${orderId}`);
    }
  }, [state, router, orderId]);

  const canAssign = role !== "executive";

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="quotedPricePaise">
            Quoted price (₹) <span className="text-destructive">*</span>
          </Label>
          <MoneyInput
            id="quotedPricePaise"
            name="quotedPricePaise"
            required
            defaultValuePaise={defaultValues.quotedPricePaise}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="govtFeePaise">Govt. fee (₹)</Label>
          <MoneyInput
            id="govtFeePaise"
            name="govtFeePaise"
            defaultValuePaise={defaultValues.govtFeePaise}
          />
        </div>
      </div>

      {canAssign ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="assignedTo">Assigned to</Label>
          <Select
            name="assignedTo"
            defaultValue={defaultValues.assignedTo ?? undefined}
            items={staff.map((member) => ({ value: member.id, label: member.name }))}
          >
            <SelectTrigger id="assignedTo" className="w-full">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              {staff.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={defaultValues.notes ?? ""} />
      </div>

      {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
