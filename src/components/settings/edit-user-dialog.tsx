"use client";

import { PencilIcon } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { updateUserAction } from "@/actions/users";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EditUserDialog({
  userId,
  name,
  email,
}: {
  userId: string;
  name: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    updateUserAction.bind(null, userId),
    undefined,
  );

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PencilIcon className="size-3.5" aria-hidden="true" />
        Edit
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user profile</DialogTitle>
          <DialogDescription>
            Update the name shown across the CRM and the email used to sign in.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`user-name-${userId}`}>
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`user-name-${userId}`}
              name="name"
              defaultValue={name}
              autoComplete="name"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`user-email-${userId}`}>
              Sign-in email <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`user-email-${userId}`}
              name="email"
              type="email"
              defaultValue={email}
              autoComplete="email"
              required
            />
            <p className="text-xs leading-5 text-slate-500">
              The user will use this address the next time they sign in.
            </p>
          </div>

          {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
