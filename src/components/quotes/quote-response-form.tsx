"use client";

import { useActionState, useState } from "react";
import { respondToQuoteAction } from "@/actions/quote-response";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Intent = "approved" | "negotiating";

export function QuoteResponseForm({ quoteId, token }: { quoteId: string; token: string }) {
  const [intent, setIntent] = useState<Intent | null>(null);
  const action = respondToQuoteAction.bind(null, quoteId, token);
  const [state, formAction, isPending] = useActionState(action, undefined);

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-8 text-center">
        <p className="text-lg font-semibold">Thanks — we've got your response</p>
        <p className="text-sm text-muted-foreground">
          {intent === "approved"
            ? "We'll follow up shortly to get started."
            : "We'll follow up shortly to discuss and, if needed, send a revised quote."}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border bg-card p-6">
      <input type="hidden" name="response" value={intent ?? ""} />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant={intent === "approved" ? "default" : "outline"}
          className="flex-1"
          onClick={() => setIntent("approved")}
        >
          ✅ Approve this quote
        </Button>
        <Button
          type="button"
          variant={intent === "negotiating" ? "default" : "outline"}
          className="flex-1"
          onClick={() => setIntent("negotiating")}
        >
          💬 Request changes
        </Button>
      </div>

      {intent === "negotiating" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="response-note">What would you like changed?</Label>
          <Textarea
            id="response-note"
            name="note"
            rows={3}
            placeholder="e.g. Could you revisit the professional fee, or the timeline?"
          />
        </div>
      ) : null}

      {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button type="submit" disabled={!intent || isPending}>
        {isPending ? "Sending…" : intent === "negotiating" ? "Send my note" : "Confirm my response"}
      </Button>
    </form>
  );
}
