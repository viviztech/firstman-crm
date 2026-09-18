"use client";

import { EyeIcon, EyeOffIcon, KeyRoundIcon } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { resetUserPasswordAction } from "@/actions/users";
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

export function ResetUserPasswordDialog({
  userId,
  userName,
  disabled = false,
}: {
  userId: string;
  userName: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, isPending] = useActionState(
    resetUserPasswordAction.bind(null, userId),
    undefined,
  );

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setShowPassword(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" disabled={disabled} />}>
        <KeyRoundIcon className="size-3.5" aria-hidden="true" />
        Password
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset {userName}&apos;s password</DialogTitle>
          <DialogDescription>
            Set a temporary password and share it securely. All active sessions for this user will
            be signed out.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
            The user will need the new password to sign in again.
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`new-password-${userId}`}>
              New password <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id={`new-password-${userId}`}
                name="newPassword"
                type={showPassword ? "text" : "password"}
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-pink-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOffIcon className="size-4" aria-hidden="true" />
                ) : (
                  <EyeIcon className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500">Use at least 8 characters.</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`confirm-password-${userId}`}>
              Confirm password <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`confirm-password-${userId}`}
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </div>

          {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Resetting…" : "Reset password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
