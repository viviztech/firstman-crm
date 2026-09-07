"use client";

import { CheckCircle2 } from "lucide-react";
import { useActionState } from "react";
import { submitMarketingEnquiryAction } from "@/actions/marketing-enquiry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ServiceOption = { id: string; name: string };
type StateOption = { id: string; name: string };

export function MarketingEnquiryForm({
  services,
  states,
  defaultServiceId,
}: {
  services: ServiceOption[];
  /** Populates the state field so the auto-sent quote (services with statewise pricing) picks the right fee breakdown. */
  states: StateOption[];
  defaultServiceId?: string;
}) {
  const [state, formAction, isPending] = useActionState(submitMarketingEnquiryAction, undefined);

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-8 text-center">
        <CheckCircle2 className="text-brand size-10" />
        <h3 className="text-lg font-semibold">Thanks — we've got your details</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Someone from our team will reach out shortly. If you shared a WhatsApp number, expect a
          quick message from us too.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border bg-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="enquiry-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input id="enquiry-name" name="name" required placeholder="Your name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="enquiry-phone">
            Phone <span className="text-destructive">*</span>
          </Label>
          <Input id="enquiry-phone" name="phone" required placeholder="98765 43210" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="enquiry-email">Email</Label>
          <Input id="enquiry-email" name="email" type="email" placeholder="you@example.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="enquiry-city">City</Label>
          <Input id="enquiry-city" name="city" placeholder="Chennai" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="enquiry-state">State</Label>
        <Select
          name="state"
          items={states.map((state) => ({ value: state.name, label: state.name }))}
        >
          <SelectTrigger id="enquiry-state" className="w-full">
            <SelectValue placeholder="Select your state" />
          </SelectTrigger>
          <SelectContent>
            {states.map((state) => (
              <SelectItem key={state.id} value={state.name}>
                {state.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Some fees (e.g. company registration) vary by state — this gets you an accurate quote.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="enquiry-service">What do you need help with?</Label>
          <Select
            name="serviceInterestedId"
            defaultValue={defaultServiceId}
            items={services.map((service) => ({ value: service.id, label: service.name }))}
          >
            <SelectTrigger id="enquiry-service" className="w-full">
              <SelectValue placeholder="Select a service" />
            </SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="enquiry-directors">Number of directors/partners</Label>
          <Input
            id="enquiry-directors"
            name="numberOfDirectors"
            type="number"
            min={1}
            max={50}
            placeholder="e.g. 2"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="enquiry-capital">Authorized capital</Label>
        <MoneyInput id="enquiry-capital" name="capitalAmountPaise" placeholder="1,00,000" />
        <p className="text-xs text-muted-foreground">
          For company/LLP registration — some fees (e.g. MOA/AOA stamp duty) scale with this.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="enquiry-notes">Anything else we should know?</Label>
        <Textarea id="enquiry-notes" name="notes" rows={3} placeholder="Optional" />
      </div>

      {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button
        type="submit"
        disabled={isPending}
        className="bg-brand text-brand-foreground hover:bg-brand/90"
      >
        {isPending ? "Sending…" : "Talk to us"}
      </Button>
      <p className="text-xs text-muted-foreground">
        By submitting, you agree to be contacted by phone, WhatsApp, or email about your enquiry.
      </p>
    </form>
  );
}

/**
 * Minimal name + phone capture for tight spaces (e.g. a service page hero) — full detail is
 * normally gathered on follow-up. Copy is overridable per page: submitting always sends the
 * auto-quote job (see enqueueEnquiryQuoteIssuedNotification) once a defaultServiceId is set, so
 * a page that wants to foreground that (e.g. the Pvt Ltd registration page) can say so
 * explicitly — and, by passing `states`, also collect the email/state/directors/capital that a
 * state-and-capital-aware quote needs (and that the auto-quote job needs to email the PDF —
 * notifyEmail no-ops without one), without turning this into the full MarketingEnquiryForm. The
 * service itself never shows here — it's implied by the page and travels only as a hidden field.
 */
export function QuickEnquiryForm({
  defaultServiceId,
  states,
  defaultState = "Tamil Nadu",
  ctaLabel = "Request a callback",
  successHeading = "Thanks — we've got your details",
  successBody = "Our team will reach out shortly.",
}: {
  defaultServiceId?: string;
  /** Presence (non-empty) turns on the fuller quote-detail fields: email, state, directors, capital. */
  states?: StateOption[];
  /** Pre-selected state name — must match one of `states`' names. Defaults to the firm's home state so most visitors get an accurate quote without picking anything. */
  defaultState?: string;
  ctaLabel?: string;
  successHeading?: string;
  successBody?: string;
}) {
  const [state, formAction, isPending] = useActionState(submitMarketingEnquiryAction, undefined);
  const showQuoteDetails = Boolean(states && states.length > 0);

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <CheckCircle2 className="text-brand size-8" />
        <p className="text-sm font-semibold">{successHeading}</p>
        <p className="text-xs text-muted-foreground">{successBody}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {defaultServiceId ? (
        <input type="hidden" name="serviceInterestedId" value={defaultServiceId} />
      ) : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="quick-enquiry-name" className="sr-only">
          Name
        </Label>
        <Input id="quick-enquiry-name" name="name" required placeholder="Your name" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="quick-enquiry-phone" className="sr-only">
          Phone
        </Label>
        <Input id="quick-enquiry-phone" name="phone" required placeholder="98765 43210" />
      </div>

      {showQuoteDetails ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-enquiry-email" className="text-xs text-muted-foreground">
              Email
            </Label>
            <Input
              id="quick-enquiry-email"
              name="email"
              type="email"
              placeholder="you@example.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-enquiry-state" className="text-xs text-muted-foreground">
              State
            </Label>
            <Select
              name="state"
              defaultValue={defaultState}
              items={(states ?? []).map((s) => ({ value: s.name, label: s.name }))}
            >
              <SelectTrigger id="quick-enquiry-state" className="w-full">
                <SelectValue placeholder="Select your state" />
              </SelectTrigger>
              <SelectContent>
                {(states ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.name}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quick-enquiry-directors" className="text-xs text-muted-foreground">
                Directors/partners
              </Label>
              <Input
                id="quick-enquiry-directors"
                name="numberOfDirectors"
                type="number"
                min={1}
                max={50}
                placeholder="2"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quick-enquiry-capital" className="text-xs text-muted-foreground">
                Authorized capital
              </Label>
              <MoneyInput id="quick-enquiry-capital" name="capitalAmountPaise" placeholder="1L" />
            </div>
          </div>
        </>
      ) : null}

      {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button
        type="submit"
        disabled={isPending}
        className="bg-brand text-brand-foreground hover:bg-brand/90"
      >
        {isPending ? "Sending…" : ctaLabel}
      </Button>
    </form>
  );
}
