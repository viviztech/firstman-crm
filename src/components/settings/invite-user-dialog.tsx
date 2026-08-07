"use client";

import { CheckCircle2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { inviteUserAction } from "@/actions/users";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLES } from "@/lib/roles";

export function InviteUserDialog() {
  const [open, setOpen] = useState(false);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(inviteUserAction, undefined);

  useEffect(() => {
    if (state?.ok) {
      setCreatedEmail(state.data.email);
    }
  }, [state]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setCreatedEmail(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>Invite user</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a user</DialogTitle>
          <DialogDescription>
            Creates an account and emails them a temporary password.
          </DialogDescription>
        </DialogHeader>

        {createdEmail ? (
          <>
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle2 className="text-primary size-8" />
              <p className="text-sm">
                Account created for <span className="font-medium">{createdEmail}</span> — an email
                with sign-in details is on its way.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input id="invite-name" name="name" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input id="invite-email" name="email" type="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-role">
                Role <span className="text-destructive">*</span>
              </Label>
              <Select
                name="role"
                defaultValue="executive"
                items={ROLES.map((role) => ({ value: role, label: role.replace("_", " ") }))}
              >
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}

            <DialogFooter showCloseButton>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating…" : "Create account"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
