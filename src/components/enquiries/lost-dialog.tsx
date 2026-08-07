"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateEnquiryStatusAction } from "@/actions/enquiries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

/**
 * Fully controlled (no built-in trigger) so it can be opened both from a plain button (see
 * `LostButton` below, used by the enquiry detail page) and from a kanban drag-to-Lost drop
 * (kanban-board.tsx), which needs to manage its own optimistic-move/revert state around it.
 */
export function LostDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  function handleOpenChange(next: boolean) {
    if (!next) setReason("");
    onOpenChange(next);
  }

  function handleConfirm() {
    const trimmed = reason.trim();
    if (!trimmed) return;
    setReason("");
    onConfirm(trimmed);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Why was this enquiry lost?</DialogTitle>
          <DialogDescription>
            This reason is saved with the enquiry, which is then hidden from every list — it stays
            in the database and can be permanently deleted later from Settings.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Went with a competitor"
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!reason.trim()}>
            Mark as lost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Self-contained Lost button for the enquiry detail page — calls the status action directly. */
export function LostButton({ enquiryId }: { enquiryId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm(reason: string) {
    startTransition(async () => {
      const result = await updateEnquiryStatusAction(enquiryId, "lost", reason);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      router.push("/enquiries");
    });
  }

  return (
    <>
      <Button
        variant="destructive"
        className="flex-1"
        disabled={isPending}
        onClick={() => setOpen(true)}
      >
        Lost
      </Button>
      <LostDialog open={open} onOpenChange={setOpen} onConfirm={handleConfirm} />
    </>
  );
}
