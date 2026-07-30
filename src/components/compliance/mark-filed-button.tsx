"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { markComplianceItemFiledAction } from "@/actions/compliance";
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

export function MarkFiledButton({
  itemId,
  title,
  isRecurring,
}: {
  itemId: string;
  title: string;
  isRecurring: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await markComplianceItemFiledAction(itemId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      toast.success(isRecurring ? "Filed — next occurrence generated" : "Marked filed");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Mark filed</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark {title} as filed?</DialogTitle>
          <DialogDescription>
            {isRecurring
              ? "This generates the next occurrence automatically."
              : "This is a one-time item and won't recur."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Saving…" : "Mark filed"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
