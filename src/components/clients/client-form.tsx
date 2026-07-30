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
import type { Role } from "@/lib/auth";

export type ClientFormDefaults = {
  type?: "individual" | "business";
  name?: string;
  businessName?: string | null;
  phone?: string;
  email?: string | null;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  assignedTo?: string | null;
  referralSource?: string | null;
};

type StaffOption = { id: string; name: string };

/** Where to redirect after a successful submit — plain data, since functions can't cross the RSC boundary. */
export type ClientFormRedirect = { mode: "create" } | { mode: "edit"; clientId: string };

export function ClientForm<T extends { id: string } | undefined>({
  action,
  role,
  staff,
  defaultValues,
  submitLabel,
  redirectTo,
}: {
  action: (prev: ActionResult<T> | undefined, formData: FormData) => Promise<ActionResult<T>>;
  role: Role;
  staff: StaffOption[];
  defaultValues?: ClientFormDefaults;
  submitLabel: string;
  redirectTo: ClientFormRedirect;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.ok) {
      const target =
        redirectTo.mode === "edit"
          ? `/clients/${redirectTo.clientId}`
          : `/clients/${state.data?.id}`;
      router.push(target);
    }
  }, [state, router, redirectTo]);

  const canAssign = role !== "executive";

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="type">Type</Label>
          <Select name="type" defaultValue={defaultValues?.type ?? "individual"}>
            <SelectTrigger id="type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="businessName">Business name</Label>
          <Input
            id="businessName"
            name="businessName"
            defaultValue={defaultValues?.businessName ?? ""}
          />
        </div>
      </div>

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
          <Label htmlFor="referralSource">Referral source</Label>
          <Input
            id="referralSource"
            name="referralSource"
            defaultValue={defaultValues?.referralSource ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="gstin">GSTIN</Label>
          <Input id="gstin" name="gstin" defaultValue={defaultValues?.gstin ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pan">PAN</Label>
          <Input id="pan" name="pan" defaultValue={defaultValues?.pan ?? ""} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Address</Label>
        <Textarea id="address" name="address" defaultValue={defaultValues?.address ?? ""} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={defaultValues?.city ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" defaultValue={defaultValues?.state ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pincode">Pincode</Label>
          <Input id="pincode" name="pincode" defaultValue={defaultValues?.pincode ?? ""} />
        </div>
      </div>

      {canAssign ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="assignedTo">Assigned to</Label>
          <Select name="assignedTo" defaultValue={defaultValues?.assignedTo ?? undefined}>
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

      {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
