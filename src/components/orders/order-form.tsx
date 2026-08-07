"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import type { ActionResult } from "@/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type ClientOption = { id: string; name: string; phone: string };
type ServiceOption = {
  id: string;
  name: string;
  basePricePaise: number;
  govtFeePaise: number | null;
  estimatedDays: number;
};
type StaffOption = { id: string; name: string };

export function OrderForm({
  action,
  role,
  clients,
  services,
  staff,
}: {
  action: (
    prev: ActionResult<{ id: string }> | undefined,
    formData: FormData,
  ) => Promise<ActionResult<{ id: string }>>;
  role: Role;
  clients: ClientOption[];
  services: ServiceOption[];
  staff: StaffOption[];
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, undefined);
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(services[0]?.id);

  useEffect(() => {
    if (state?.ok) {
      router.push(`/orders/${state.data?.id}`);
    }
  }, [state, router]);

  const canAssign = role !== "executive";
  const selectedService = services.find((service) => service.id === selectedServiceId);

  function handleServiceChange(value: string | null) {
    if (!value) return;
    setSelectedServiceId(value);
  }

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="clientId">
            Client <span className="text-destructive">*</span>
          </Label>
          <Select
            name="clientId"
            defaultValue={clients[0]?.id}
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
          <Label htmlFor="serviceId">
            Service <span className="text-destructive">*</span>
          </Label>
          <Select
            name="serviceId"
            value={selectedServiceId}
            onValueChange={handleServiceChange}
            items={services.map((service) => ({ value: service.id, label: service.name }))}
          >
            <SelectTrigger id="serviceId" className="w-full">
              <SelectValue placeholder="Choose a service" />
            </SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedService ? (
            <p className="text-xs text-muted-foreground">
              Estimated turnaround: {selectedService.estimatedDays} days
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="quotedPricePaise">
            Quoted price (₹) <span className="text-destructive">*</span>
          </Label>
          <MoneyInput
            key={selectedServiceId}
            id="quotedPricePaise"
            name="quotedPricePaise"
            required
            defaultValuePaise={selectedService?.basePricePaise}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="govtFeePaise">Govt. fee (₹)</Label>
          <MoneyInput
            key={selectedServiceId}
            id="govtFeePaise"
            name="govtFeePaise"
            defaultValuePaise={selectedService?.govtFeePaise}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startedAt">Start date</Label>
          <Input id="startedAt" name="startedAt" type="datetime-local" />
        </div>
        {canAssign ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="assignedTo">Assigned to</Label>
            <Select
              name="assignedTo"
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
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" />
      </div>

      {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create order"}
        </Button>
      </div>
    </form>
  );
}
