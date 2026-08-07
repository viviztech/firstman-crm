"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createReferralPartnerAction,
  updateReferralPartnerAction,
} from "@/actions/referral-partners";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ReferralPartner = {
  id: string;
  name: string;
  phone: string;
  commissionType: "percentage" | "flat" | null;
  commissionRate: number | null;
  active: boolean;
};

export function ReferralPartnerFormDialog({ partner }: { partner?: ReferralPartner }) {
  const [open, setOpen] = useState(false);
  const action = partner
    ? updateReferralPartnerAction.bind(null, partner.id)
    : createReferralPartnerAction;
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={partner ? "outline" : "default"} size="sm" />}>
        {partner ? "Edit" : "New partner"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{partner ? "Edit referral partner" : "New referral partner"}</DialogTitle>
          <DialogDescription>
            Tracked for enquiry attribution and commission — associates never get a CRM login.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="partner-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input id="partner-name" name="name" defaultValue={partner?.name} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="partner-phone">
              Phone <span className="text-destructive">*</span>
            </Label>
            <Input id="partner-phone" name="phone" defaultValue={partner?.phone} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="partner-commission-type">Commission type</Label>
            <Select
              name="commissionType"
              defaultValue={partner?.commissionType ?? undefined}
              items={[
                { value: "percentage", label: "Percentage" },
                { value: "flat", label: "Flat" },
              ]}
            >
              <SelectTrigger id="partner-commission-type" className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="flat">Flat</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="partner-commission-rate">
              Commission rate (basis points for %, paise for flat)
            </Label>
            <Input
              id="partner-commission-rate"
              name="commissionRate"
              type="number"
              min={0}
              defaultValue={partner?.commissionRate ?? undefined}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="partner-active"
              name="active"
              type="checkbox"
              defaultChecked={partner?.active ?? true}
              className="size-4"
            />
            <Label htmlFor="partner-active">Active</Label>
          </div>

          {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
