"use client";

import { useRouter } from "next/navigation";
import { type FocusEvent, type FormEvent, useRef, useState, useTransition } from "react";
import { closeEnquiryAsSaleAction } from "@/actions/enquiries";
import { lookupPincodeAction } from "@/actions/geography";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ENQUIRY_SOURCE_LABEL, type EnquirySource } from "@/lib/badges";

type ServiceOption = {
  id: string;
  name: string;
  basePricePaise: number;
  govtFeePaise: number | null;
};
type StateOption = { id: string; name: string };

export function SalesDialog({
  enquiryId,
  open,
  onOpenChange,
  source,
  defaults,
  services,
  states,
}: {
  enquiryId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: EnquirySource;
  defaults: {
    name: string;
    phone: string;
    email?: string | null;
    address?: string | null;
    pincode?: string | null;
    serviceInterestedId?: string | null;
  };
  services: ServiceOption[];
  states: StateOption[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [serviceId, setServiceId] = useState(defaults.serviceInterestedId ?? "");
  // MoneyInput manages its own rupee-string state internally (see its doc comment) — the price
  // fields reset to a newly-selected service's defaults by remounting on `priceToken`, which
  // only advances on an explicit selection (never on the initial preset `serviceId`, matching
  // the pre-existing behavior of leaving price blank until the user actively chooses a service).
  const [priceToken, setPriceToken] = useState(0);
  const [priceDefaults, setPriceDefaults] = useState<{
    quotedPricePaise?: number;
    govtFeePaise?: number | null;
  }>({});
  const [stateName, setStateName] = useState("");

  function handleServiceChange(value: string | null) {
    if (!value) return;
    setServiceId(value);
    const service = services.find((candidate) => candidate.id === value);
    setPriceDefaults({
      quotedPricePaise: service?.basePricePaise,
      govtFeePaise: service?.govtFeePaise,
    });
    setPriceToken((token) => token + 1);
  }

  async function handlePincodeBlur(event: FocusEvent<HTMLInputElement>) {
    const pincode = event.target.value.trim();
    if (!/^\d{6}$/.test(pincode)) return;
    const match = await lookupPincodeAction(pincode);
    if (match) setStateName(match.state);
  }

  // Calls the action directly (rather than useActionState) and navigates as a direct
  // continuation of the resolved promise. A successful sale flips the enquiry to "won", which
  // makes the parent unmount this dialog's trigger — with useActionState, that unmount races the
  // effect that would've read the new state and redirected, so the redirect never fires. Driving
  // the redirect off the awaited result here isn't subject to that race.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await closeEnquiryAsSaleAction(enquiryId, undefined, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.push(`/clients/${result.data.clientId}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Close as a sale</DialogTitle>
          <DialogDescription>
            Review the details, choose a service and price, then create the client and order.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sales-name">Name</Label>
              <Input id="sales-name" name="name" required defaultValue={defaults.name} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sales-phone">Phone</Label>
              <Input id="sales-phone" name="phone" required defaultValue={defaults.phone} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sales-email">Email</Label>
              <Input
                id="sales-email"
                name="email"
                type="email"
                defaultValue={defaults.email ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sales-pincode">Pincode</Label>
              <Input
                id="sales-pincode"
                name="pincode"
                defaultValue={defaults.pincode ?? ""}
                onBlur={handlePincodeBlur}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sales-address">Address</Label>
              <Textarea
                id="sales-address"
                name="address"
                rows={2}
                defaultValue={defaults.address ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sales-state">State</Label>
              <Select
                name="state"
                value={stateName}
                onValueChange={(value) => setStateName(value ?? "")}
                items={states.map((s) => ({ value: s.name, label: s.name }))}
              >
                <SelectTrigger id="sales-state" className="w-full">
                  <SelectValue placeholder="Select a state" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">Source: {ENQUIRY_SOURCE_LABEL[source]}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sales-service">
                Service <span className="text-destructive">*</span>
              </Label>
              <Select
                name="serviceId"
                value={serviceId}
                onValueChange={handleServiceChange}
                items={services.map((service) => ({ value: service.id, label: service.name }))}
              >
                <SelectTrigger id="sales-service" className="w-full">
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
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sales-price">
                Price (₹) <span className="text-destructive">*</span>
              </Label>
              <MoneyInput
                key={priceToken}
                id="sales-price"
                name="quotedPricePaise"
                required
                defaultValuePaise={priceDefaults.quotedPricePaise}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sales-govt-fee">Govt. fee (₹)</Label>
            <MoneyInput
              key={priceToken}
              id="sales-govt-fee"
              name="govtFeePaise"
              defaultValuePaise={priceDefaults.govtFeePaise}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sales-comments">Comments</Label>
            <Textarea id="sales-comments" name="comments" rows={2} placeholder="Optional" />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending || !serviceId}>
              {isPending ? "Closing…" : "Close sale"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
