"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { convertLeadAction } from "@/actions/leads";
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

export function ConvertLeadButton({ leadId, leadName }: { leadId: string; leadName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConvert() {
    setError(null);
    startTransition(async () => {
      const result = await convertLeadAction(leadId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.push(`/clients/${result.data.clientId}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Convert to client</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert {leadName} to a client?</DialogTitle>
          <DialogDescription>
            Creates (or links) a client record from this lead's details and marks the lead won.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter showCloseButton>
          <Button onClick={handleConvert} disabled={isPending}>
            {isPending ? "Converting…" : "Convert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
