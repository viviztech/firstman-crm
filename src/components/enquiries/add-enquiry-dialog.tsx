"use client";

import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { createEnquiryAction } from "@/actions/enquiries";
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
import { enquirySourceEnum } from "@/db/schema/enquiries";
import { ENQUIRY_SOURCE_LABEL } from "@/lib/badges";

type ServiceOption = { id: string; name: string };

/**
 * Lightweight quick-capture form for a sales rep who just got off a call — deliberately only the
 * 5 fields that matter in the moment. Reuses createEnquiryAction/enquiryInputSchema as-is since
 * every field beyond name/phone/source is already optional there.
 */
export function AddEnquiryDialog({ services }: { services: ServiceOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createEnquiryAction, undefined);

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusIcon />
        Add Enquiry
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add enquiry</DialogTitle>
          <DialogDescription>
            Capture the essentials now — details can be added later.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="add-enq-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input id="add-enq-name" name="name" required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="add-enq-phone">
              Phone <span className="text-destructive">*</span>
            </Label>
            <Input id="add-enq-phone" name="phone" required placeholder="98765 43210" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="add-enq-email">Email</Label>
            <Input id="add-enq-email" name="email" type="email" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="add-enq-service">Service</Label>
            <Select
              name="serviceInterestedId"
              items={services.map((service) => ({ value: service.id, label: service.name }))}
            >
              <SelectTrigger id="add-enq-service" className="w-full">
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
            <Label htmlFor="add-enq-source">
              Source <span className="text-destructive">*</span>
            </Label>
            <Select
              name="source"
              defaultValue="website"
              items={enquirySourceEnum.enumValues.map((value) => ({
                value,
                label: ENQUIRY_SOURCE_LABEL[value],
              }))}
            >
              <SelectTrigger id="add-enq-source" className="w-full">
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

          {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Add enquiry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
