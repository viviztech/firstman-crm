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

type ClientOption = { id: string; name: string; phone: string };
type ServiceOption = { id: string; name: string };

export function ComplianceForm({
  action,
  clients,
  services,
  defaultClientId,
}: {
  action: (
    prev: ActionResult<{ id: string }> | undefined,
    formData: FormData,
  ) => Promise<ActionResult<{ id: string }>>;
  clients: ClientOption[];
  services: ServiceOption[];
  defaultClientId?: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.ok) {
      router.push(`/compliance/${state.data?.id}`);
    }
  }, [state, router]);

  return (
    <form
      action={formAction}
      className="flex w-full flex-col gap-5 rounded-2xl border border-pink-100 bg-white p-4 shadow-[0_18px_45px_-36px_rgba(107,28,64,0.45)] sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="clientId">
            Client <span className="text-destructive">*</span>
          </Label>
          <Select
            name="clientId"
            defaultValue={defaultClientId ?? clients[0]?.id}
            items={clients.map((client) => ({
              value: client.id,
              label: `${client.name} · ${client.phone}`,
            }))}
          >
            <SelectTrigger id="clientId" className="w-full">
              <SelectValue placeholder="Choose a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name} · {client.phone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="serviceId">Related service</Label>
          <Select
            name="serviceId"
            items={services.map((service) => ({ value: service.id, label: service.name }))}
          >
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
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input id="title" name="title" required placeholder="e.g. GST return — July 2026" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="dueDate">
            Due date <span className="text-destructive">*</span>
          </Label>
          <Input id="dueDate" name="dueDate" type="date" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="recurrence">Recurrence</Label>
          <Select
            name="recurrence"
            defaultValue="none"
            items={complianceRecurrenceEnum.enumValues.map((value) => ({
              value,
              label: COMPLIANCE_RECURRENCE_LABEL[value],
            }))}
          >
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

      <div className="flex justify-end border-t border-pink-100 pt-5">
        <Button type="submit" className="min-w-48" disabled={isPending}>
          {isPending ? "Creating…" : "Create compliance item"}
        </Button>
      </div>
    </form>
  );
}
