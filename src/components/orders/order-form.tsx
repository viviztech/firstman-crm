"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
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
  const [quotedPricePaise, setQuotedPricePaise] = useState(
    String(services[0]?.basePricePaise ?? ""),
  );
  const [govtFeePaise, setGovtFeePaise] = useState(String(services[0]?.govtFeePaise ?? ""));

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
    const service = services.find((candidate) => candidate.id === value);
    if (service) {
      setQuotedPricePaise(String(service.basePricePaise));
      setGovtFeePaise(String(service.govtFeePaise ?? ""));
    }
  }

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="clientId">
            Client <span className="text-destructive">*</span>
          </Label>
          <Select name="clientId" defaultValue={clients[0]?.id}>
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
          <Select name="serviceId" value={selectedServiceId} onValueChange={handleServiceChange}>
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
            Quoted price (paise) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="quotedPricePaise"
            name="quotedPricePaise"
            type="number"
            min={0}
            required
            value={quotedPricePaise}
            onChange={(event) => setQuotedPricePaise(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="govtFeePaise">Govt. fee (paise)</Label>
          <Input
            id="govtFeePaise"
            name="govtFeePaise"
            type="number"
            min={0}
            value={govtFeePaise}
            onChange={(event) => setGovtFeePaise(event.target.value)}
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
            <Select name="assignedTo">
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
