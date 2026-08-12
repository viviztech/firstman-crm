"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateOrderStatusAction } from "@/actions/orders";
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

/**
 * Super_admin-only escape hatch for the hard completion gate (ADR 0002) — marks a job card
 * Completed even with open tasks and/or an unpaid proforma. The bypass is re-checked against
 * actor.role server-side in updateOrderStatus; this button being rendered at all already implies
 * super_admin (gated by the caller), but the server never trusts that alone.
 */
export function ForceCompleteOrderButton({
  orderId,
  orderNo,
}: {
  orderId: string;
  orderNo: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleForceComplete() {
    setError(null);
    startTransition(async () => {
      const result = await updateOrderStatusAction(orderId, "completed", true);
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
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>
        Force complete
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Force complete {orderNo}?</DialogTitle>
          <DialogDescription>
            This marks the job card Completed even though not every task is done and/or its proforma
            invoice isn't paid in full. Use only for a genuine data-correction case — this bypass is
            logged.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter showCloseButton>
          <Button variant="destructive" onClick={handleForceComplete} disabled={isPending}>
            {isPending ? "Completing…" : "Force complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
