"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import type { ActionResult } from "@/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { complianceRecurrenceEnum } from "@/db/schema/compliance";
import { COMPLIANCE_RECURRENCE_LABEL } from "@/lib/badges";

type ServiceOption = { id: string; name: string };

function toDateInputValue(value: Date | string): string {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function ComplianceEditForm({
  action,
  services,
  itemId,
  defaultValues,
}: {
  action: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  services: ServiceOption[];
  itemId: string;
  defaultValues: {
    serviceId: string | null;
    title: string;
    description: string | null;
    dueDate: Date | string;
    recurrence: string;
  };
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.ok) {
      router.push(`/compliance/${itemId}`);
    }
  }, [state, router, itemId]);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="serviceId">Related service</Label>
        <Select name="serviceId" defaultValue={defaultValues.serviceId ?? undefined}>
          <SelectTrigger id="serviceId" className="w-full">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input id="title" name="title" required defaultValue={defaultValues.title} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={defaultValues.description ?? ""}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="dueDate">
            Due date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            required
            defaultValue={toDateInputValue(defaultValues.dueDate)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="recurrence">Recurrence</Label>
          <Select name="recurrence" defaultValue={defaultValues.recurrence}>
            <SelectTrigger id="recurrence" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {complianceRecurrenceEnum.enumValues.map((value) => (
                <SelectItem key={value} value={value}>
                  {COMPLIANCE_RECURRENCE_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
