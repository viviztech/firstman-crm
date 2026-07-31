"use client";

import { CheckCircle2 } from "lucide-react";
import { useActionState } from "react";
import { submitMarketingLeadAction } from "@/actions/marketing-lead";
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

type ServiceOption = { id: string; name: string };

export function MarketingLeadForm({
  services,
  defaultServiceId,
}: {
  services: ServiceOption[];
  defaultServiceId?: string;
}) {
  const [state, formAction, isPending] = useActionState(submitMarketingLeadAction, undefined);

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-8 text-center">
        <CheckCircle2 className="text-brand size-10" />
        <h3 className="text-lg font-semibold">Thanks — we've got your details</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Someone from our team will reach out shortly. If you shared a WhatsApp number, expect a
          quick message from us too.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border bg-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lead-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input id="lead-name" name="name" required placeholder="Your name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lead-phone">
            Phone <span className="text-destructive">*</span>
          </Label>
          <Input id="lead-phone" name="phone" required placeholder="98765 43210" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lead-email">Email</Label>
          <Input id="lead-email" name="email" type="email" placeholder="you@example.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lead-city">City</Label>
          <Input id="lead-city" name="city" placeholder="Chennai" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lead-service">What do you need help with?</Label>
        <Select name="serviceInterestedId" defaultValue={defaultServiceId}>
          <SelectTrigger id="lead-service" className="w-full">
            <SelectValue placeholder="Select a service" />
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lead-notes">Anything else we should know?</Label>
        <Textarea id="lead-notes" name="notes" rows={3} placeholder="Optional" />
      </div>

      {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button
        type="submit"
        disabled={isPending}
        className="bg-brand text-brand-foreground hover:bg-brand/90"
      >
        {isPending ? "Sending…" : "Talk to us"}
      </Button>
      <p className="text-xs text-muted-foreground">
        By submitting, you agree to be contacted by phone, WhatsApp, or email about your enquiry.
      </p>
    </form>
  );
}
