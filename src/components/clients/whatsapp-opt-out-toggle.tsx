"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setWhatsAppOptOutAction } from "@/actions/clients";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function WhatsAppOptOutToggle({
  clientId,
  initialOptedOut,
}: {
  clientId: string;
  initialOptedOut: boolean;
}) {
  const [optedOut, setOptedOut] = useState(initialOptedOut);
  const [isPending, startTransition] = useTransition();

  function handleChange(checked: boolean) {
    setOptedOut(checked);
    startTransition(async () => {
      const result = await setWhatsAppOptOutAction(clientId, checked);
      if (!result.ok) {
        setOptedOut(!checked);
        toast.error(result.error);
        return;
      }
      toast.success(
        checked ? "Opted out of WhatsApp messages" : "Opted back in to WhatsApp messages",
      );
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id="whatsappOptedOut"
        checked={optedOut}
        onCheckedChange={(checked) => handleChange(checked === true)}
        disabled={isPending}
      />
      <Label htmlFor="whatsappOptedOut">Opted out of WhatsApp messages</Label>
    </div>
  );
}
