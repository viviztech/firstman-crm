"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createOrderFromComplianceItemAction } from "@/actions/compliance";
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

export function CreateOrderFromComplianceButton({
  itemId,
  title,
}: {
  itemId: string;
  title: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await createOrderFromComplianceItemAction(itemId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.push(`/orders/${result.data.orderId}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>Create order</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create an order for {title}?</DialogTitle>
          <DialogDescription>
            Creates a new order for the linked service, priced at the catalog rate, and links it
            back to this compliance item.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter showCloseButton>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Creating…" : "Create order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
