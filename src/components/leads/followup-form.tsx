"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { addFollowupAction } from "@/actions/leads";
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
import { leadFollowupChannelEnum } from "@/db/schema/leads";

const CHANNEL_LABEL: Record<(typeof leadFollowupChannelEnum.enumValues)[number], string> = {
  call: "Call",
  whatsapp: "WhatsApp",
  email: "Email",
  meeting: "Meeting",
};

export function FollowupForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const action = addFollowupAction.bind(null, leadId);
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.ok) {
      setFormKey((key) => key + 1);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form key={formKey} action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="channel">Channel</Label>
          <Select name="channel" defaultValue="call">
            <SelectTrigger id="channel" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {leadFollowupChannelEnum.enumValues.map((value) => (
                <SelectItem key={value} value={value}>
                  {CHANNEL_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="followupNextFollowUpAt">Next follow-up</Label>
          <Input id="followupNextFollowUpAt" name="nextFollowUpAt" type="datetime-local" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="summary">Summary</Label>
        <Textarea id="summary" name="summary" required placeholder="What happened?" />
      </div>
      {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Log follow-up"}
        </Button>
      </div>
    </form>
  );
}
