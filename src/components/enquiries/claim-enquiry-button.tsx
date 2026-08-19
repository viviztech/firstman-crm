"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { claimEnquiryAction } from "@/actions/enquiries";
import { Button } from "@/components/ui/button";

export function ClaimEnquiryButton({ enquiryId }: { enquiryId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [claimed, setClaimed] = useState(false);

  function handleClick() {
    startTransition(async () => {
      const result = await claimEnquiryAction(enquiryId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setClaimed(true);
      router.refresh();
    });
  }

  return (
    <Button
      variant="outline"
      className="flex-1"
      disabled={isPending || claimed}
      onClick={handleClick}
    >
      {claimed ? "Picked" : isPending ? "Picking…" : "Pick"}
    </Button>
  );
}
