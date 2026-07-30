"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendInvoiceAction } from "@/actions/invoices";
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

export function SendInvoiceButton({
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
      const result = await sendInvoiceAction(invoiceId);
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
      <DialogTrigger render={<Button />}>Send invoice</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send invoice {invoiceNo}?</DialogTitle>
          <DialogDescription>
            The invoice locks (line items can no longer be edited) and a notification is queued for
            the client.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter showCloseButton>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Sending…" : "Send invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
