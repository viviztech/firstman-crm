"use client";

import { useRouter } from "next/navigation";
import type { FocusEvent } from "react";
import { useActionState, useEffect, useState } from "react";
import { lookupPincodeAction } from "@/actions/geography";
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
import { enquirySourceEnum } from "@/db/schema/enquiries";
import type { Role } from "@/lib/auth";
import { ENQUIRY_SOURCE_LABEL } from "@/lib/badges";

export type EnquiryFormDefaults = {
  name?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  source?: string;
  serviceInterestedId?: string | null;
  referralPartnerId?: string | null;
  assignedTo?: string | null;
  nextFollowUpAt?: Date | string | null;
  notes?: string | null;
};

type StaffOption = { id: string; name: string };
type ServiceOption = { id: string; name: string };
type ReferralPartnerOption = { id: string; name: string };

export type EnquiryFormRedirect = { mode: "create" } | { mode: "edit"; enquiryId: string };

function toDateTimeLocalValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EnquiryForm<T extends { id: string } | undefined>({
  action,
  role,
  staff,
  services,
  referralPartners,
  defaultValues,
  submitLabel,
  redirectTo,
}: {
  action: (prev: ActionResult<T> | undefined, formData: FormData) => Promise<ActionResult<T>>;
  role: Role;
  staff: StaffOption[];
  services: ServiceOption[];
  referralPartners: ReferralPartnerOption[];
  defaultValues?: EnquiryFormDefaults;
  submitLabel: string;
  redirectTo: EnquiryFormRedirect;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, undefined);
  const [city, setCity] = useState(defaultValues?.city ?? "");

  async function handlePincodeBlur(event: FocusEvent<HTMLInputElement>) {
    const pincode = event.target.value.trim();
    if (!/^\d{6}$/.test(pincode)) return;
    const match = await lookupPincodeAction(pincode);
    if (match) setCity(match.city);
  }

  useEffect(() => {
    if (state?.ok) {
      const target =
        redirectTo.mode === "edit"
          ? `/enquiries/${redirectTo.enquiryId}`
          : `/enquiries/${state.data?.id}`;
      router.push(target);
    }
  }, [state, router, redirectTo]);

  const canAssign = role !== "executive";

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input id="name" name="name" required defaultValue={defaultValues?.name ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">
            Phone <span className="text-destructive">*</span>
          </Label>
          <Input
            id="phone"
            name="phone"
            required
            placeholder="98765 43210"
            defaultValue={defaultValues?.phone ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={defaultValues?.email ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          name="address"
          rows={2}
          defaultValue={defaultValues?.address ?? ""}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="pincode">Pincode</Label>
          <Input
            id="pincode"
            name="pincode"
            placeholder="560001"
            defaultValue={defaultValues?.pincode ?? ""}
            onBlur={handlePincodeBlur}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="source">
            Source <span className="text-destructive">*</span>
          </Label>
          <Select
            name="source"
            defaultValue={defaultValues?.source ?? "website"}
            items={enquirySourceEnum.enumValues.map((value) => ({
              value,
              label: ENQUIRY_SOURCE_LABEL[value],
            }))}
          >
            <SelectTrigger id="source" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {enquirySourceEnum.enumValues.map((value) => (
                <SelectItem key={value} value={value}>
                  {ENQUIRY_SOURCE_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="serviceInterestedId">Service interested</Label>
          <Select
            name="serviceInterestedId"
            defaultValue={defaultValues?.serviceInterestedId ?? undefined}
            items={services.map((service) => ({ value: service.id, label: service.name }))}
          >
            <SelectTrigger id="serviceInterestedId" className="w-full">
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
          <Label htmlFor="referralPartnerId">Referral partner</Label>
          <Select
            name="referralPartnerId"
            defaultValue={defaultValues?.referralPartnerId ?? undefined}
            items={referralPartners.map((partner) => ({ value: partner.id, label: partner.name }))}
          >
            <SelectTrigger id="referralPartnerId" className="w-full">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {referralPartners.map((partner) => (
                <SelectItem key={partner.id} value={partner.id}>
                  {partner.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="nextFollowUpAt">Next follow-up</Label>
        <Input
          id="nextFollowUpAt"
          name="nextFollowUpAt"
          type="datetime-local"
          defaultValue={toDateTimeLocalValue(defaultValues?.nextFollowUpAt)}
        />
      </div>

      {canAssign ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="assignedTo">Assigned to</Label>
          <Select
            name="assignedTo"
            defaultValue={defaultValues?.assignedTo ?? undefined}
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
        <Label htmlFor="notes">Comments</Label>
        <Textarea id="notes" name="notes" defaultValue={defaultValues?.notes ?? ""} />
      </div>

      {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
