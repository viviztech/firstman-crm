"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelInvoiceAction } from "@/actions/invoices";
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

export function CancelInvoiceButton({
  invoiceId,
  invoiceNo,
}: {
  invoiceId: string;
  invoiceNo: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await cancelInvoiceAction(invoiceId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>Cancel invoice</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel invoice {invoiceNo}?</DialogTitle>
          <DialogDescription>
            Only invoices with no recorded payments can be cancelled. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter showCloseButton>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Cancelling…" : "Cancel invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
