"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { addFollowupAction } from "@/actions/enquiries";
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
import { Textarea } from "@/components/ui/textarea";

type StaffOption = { id: string; name: string };

export function FollowupDialog({ enquiryId, staff }: { enquiryId: string; staff: StaffOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [owner, setOwner] = useState<"self" | "others">("self");
  const [mode, setMode] = useState<"one_time" | "permanent">("one_time");
  const action = addFollowupAction.bind(null, enquiryId);
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      setOwner("self");
      setMode("one_time");
      router.refresh();
    }
  }, [state, router]);

  const handoffType = owner === "self" ? "self" : mode;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="flex-1" />}>
        Followup
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a follow-up</DialogTitle>
          <DialogDescription>
            Set the next follow-up date and time, and who should own it.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="handoffType" value={handoffType} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="followup-next">
              Next follow-up <span className="text-destructive">*</span>
            </Label>
            <Input id="followup-next" name="nextFollowUpAt" type="datetime-local" required />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Who should follow up?</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={owner === "self" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setOwner("self")}
              >
                Self
              </Button>
              <Button
                type="button"
                variant={owner === "others" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setOwner("others")}
              >
                Others
              </Button>
            </div>
          </div>

          {owner === "others" ? (
            <div className="flex flex-col gap-4 rounded-lg border p-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="followup-executive">Hand off to</Label>
                <Select
                  name="handoffTo"
                  items={staff.map((member) => ({ value: member.id, label: member.name }))}
                >
                  <SelectTrigger id="followup-executive" className="w-full">
                    <SelectValue placeholder="Choose an executive" />
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
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={mode === "one_time" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setMode("one_time")}
                >
                  One time
                </Button>
                <Button
                  type="button"
                  variant={mode === "permanent" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setMode("permanent")}
                >
                  Permanent
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="followup-summary">
              Comments <span className="text-destructive">*</span>
            </Label>
            <Textarea id="followup-summary" name="summary" required placeholder="What happened?" />
          </div>

          {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save follow-up"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
