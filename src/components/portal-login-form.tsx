"use client";

import { Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const GENERIC_MESSAGE =
  "If that phone number or email matches an account, we've sent a login link.";

export function PortalLoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      await fetch("/api/portal/request-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
    } finally {
      setIsSubmitting(false);
      setMessage(GENERIC_MESSAGE);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6 sm:p-10">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Check your order status
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter the phone number or email on file with FirstMan Corporate Services and we'll send
          you a link to sign in.
        </p>

        <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="identifier">Phone or email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="identifier"
                autoComplete="username"
                autoFocus
                required
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="h-11 pl-9"
                placeholder="9876543210 or you@email.com"
              />
            </div>
          </div>

          {message ? (
            <p role="status" className="text-sm text-muted-foreground">
              {message}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full gap-2 text-sm font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Sending…
              </>
            ) : (
              "Send login link"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
