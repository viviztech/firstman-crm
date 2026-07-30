"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateLeadStatusAction } from "@/actions/leads";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_STATUS_BADGE, type LeadStatus } from "@/lib/badges";

// "won" is deliberately excluded — that transition only happens via convertLeadToClient.
const SELECTABLE_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
  "lost",
];

export function LeadStatusSelect({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");

  function apply(next: LeadStatus, reason?: string) {
    startTransition(async () => {
      const result = await updateLeadStatusAction(leadId, next, reason);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleChange(value: string | null) {
    if (!value) return;
    const next = value as LeadStatus;
    if (next === status) return;
    if (next === "lost") {
      setLostDialogOpen(true);
      return;
    }
    apply(next);
  }

  function confirmLost() {
    const reason = lostReason.trim();
    if (!reason) return;
    setLostDialogOpen(false);
    setLostReason("");
    apply("lost", reason);
  }

  return (
    <>
      <Select value={status} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SELECTABLE_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {LEAD_STATUS_BADGE[value].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={lostDialogOpen} onOpenChange={setLostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Why was this lead lost?</DialogTitle>
            <DialogDescription>This reason is saved with the lead.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={lostReason}
            onChange={(event) => setLostReason(event.target.value)}
            placeholder="e.g. Went with a competitor"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={!lostReason.trim()} onClick={confirmLost}>
              Mark as lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
