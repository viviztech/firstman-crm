"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { pickUpJobCardAction } from "@/actions/orders";
import { Button } from "@/components/ui/button";

/** One-click self-assign for a job card an operations executive sees as "ready to pick up"
 * (ADR 0005) — the server still re-checks service scope, so this is a shortcut, not a bypass. */
export function PickUpJobCardButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handlePickUp() {
    startTransition(async () => {
      const result = await pickUpJobCardAction(orderId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Job card picked up");
      router.refresh();
    });
  }

  return (
    <Button size="sm" onClick={handlePickUp} disabled={isPending}>
      {isPending ? "Picking up…" : "Pick up"}
    </Button>
  );
}
