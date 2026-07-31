"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setUserBannedAction } from "@/actions/users";
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

export function UserBanToggle({
  userId,
  userName,
  banned,
  disabled,
}: {
  userId: string;
  userName: string;
  banned: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await setUserBannedAction(userId, !banned);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(banned ? `${userName} reactivated` : `${userName} deactivated`);
      setOpen(false);
    });
  }

  if (disabled) {
    return (
      <Button variant="outline" size="sm" disabled>
        {banned ? "Reactivate" : "Deactivate"}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={banned ? "outline" : "destructive"} size="sm" />}>
        {banned ? "Reactivate" : "Deactivate"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {banned ? `Reactivate ${userName}?` : `Deactivate ${userName}?`}
          </DialogTitle>
          <DialogDescription>
            {banned
              ? "They'll be able to sign in again immediately."
              : "They'll be signed out and unable to sign in until reactivated."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton>
          <Button
            variant={banned ? "default" : "destructive"}
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Saving…" : banned ? "Reactivate" : "Deactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
