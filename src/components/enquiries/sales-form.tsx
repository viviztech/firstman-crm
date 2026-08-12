"use client";

import { CircleAlert, MapPin, Megaphone, MessageSquare, Phone, ReceiptText } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FocusEvent, type FormEvent, useMemo, useState, useTransition } from "react";
import { closeEnquiryAsSaleAction } from "@/actions/enquiries";
import { lookupPincodeAction } from "@/actions/geography";
import {
  type SalesServiceLineSummary,
  SalesServiceLinesEditor,
} from "@/components/enquiries/sales-service-lines-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionIcon } from "@/components/ui/section-icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ENQUIRY_SOURCE_LABEL, type EnquirySource } from "@/lib/badges";
import { formatMoney, rupeesToPaise } from "@/lib/money";

type ServiceOption = { id: string; name: string; basePricePaise: number };
type StateOption = { id: string; name: string };

/**
 * Full-page replacement for the old Sales modal (used from the enquiry detail page) — a
 * conversion this consequential (creates a client + job card + proforma invoice in one
 * transaction) deserves its own page rather than a dialog easily dismissed mid-entry. Laid out
 * as form + a sticky order-summary sidebar (a checkout pattern), rather than one column of cards
 * bleeding into empty space on wide screens. The kanban board's drag-to-Won flow keeps its own
 * dialog (SalesDialog) since that interaction is inherently inline; this is a separate,
 * page-native implementation of the same form.
 */
export function SalesForm({
  enquiryId,
  source,
  defaults,
  services,
  states,
}: {
  enquiryId: string;
  source: EnquirySource;
  defaults: {
    name: string;
    phone: string;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    pincode?: string | null;
    serviceInterestedId?: string | null;
  };
  services: ServiceOption[];
  states: StateOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [city, setCity] = useState(defaults.city ?? "");
  const [stateName, setStateName] = useState("");
  const [summary, setSummary] = useState<SalesServiceLineSummary[]>([]);

  const totalPaise = useMemo(
    () => summary.reduce((total, row) => total + Number(rupeesToPaise(row.priceRupees) || 0), 0),
    [summary],
  );

  async function handlePincodeBlur(event: FocusEvent<HTMLInputElement>) {
    const pincode = event.target.value.trim();
    if (!/^\d{6}$/.test(pincode)) return;
    const match = await lookupPincodeAction(pincode);
    if (match) {
      setCity(match.city);
      setStateName(match.state);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await closeEnquiryAsSaleAction(enquiryId, undefined, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/clients/${result.data.clientId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SectionIcon icon={Phone} color="blue" />
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="sales-name">Name</Label>
                <Input id="sales-name" name="name" required defaultValue={defaults.name} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sales-phone">Phone</Label>
                <Input id="sales-phone" name="phone" required defaultValue={defaults.phone} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="sales-email">Email</Label>
                <Input
                  id="sales-email"
                  name="email"
                  type="email"
                  defaultValue={defaults.email ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sales-pincode">Pincode</Label>
                <Input
                  id="sales-pincode"
                  name="pincode"
                  defaultValue={defaults.pincode ?? ""}
                  onBlur={handlePincodeBlur}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SectionIcon icon={MapPin} color="purple" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="sales-city">City</Label>
                <Input
                  id="sales-city"
                  name="city"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sales-state">State</Label>
                <Select
                  name="state"
                  value={stateName}
                  onValueChange={(value) => setStateName(value ?? "")}
                  items={states.map((s) => ({ value: s.name, label: s.name }))}
                >
                  <SelectTrigger id="sales-state" className="w-full">
                    <SelectValue placeholder="Select a state" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sales-address">Address</Label>
              <Textarea
                id="sales-address"
                name="address"
                rows={2}
                defaultValue={defaults.address ?? ""}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SectionIcon icon={Megaphone} color="amber" />
              Sale details
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Source: {ENQUIRY_SOURCE_LABEL[source]}</p>
            <SalesServiceLinesEditor
              services={services}
              defaultServiceId={defaults.serviceInterestedId}
              onSummaryChange={setSummary}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SectionIcon icon={MessageSquare} color="slate" />
              Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="sales-comments" className="sr-only">
              Comments
            </Label>
            <Textarea id="sales-comments" name="comments" rows={2} placeholder="Optional" />
          </CardContent>
        </Card>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="gap-0 border-b bg-muted/40 py-4">
            <CardTitle className="flex items-center gap-2">
              <SectionIcon icon={ReceiptText} color="green" />
              Order summary
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{defaults.name}</span>
              <span className="text-sm text-muted-foreground">{defaults.phone}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Source</span>
              <span>{ENQUIRY_SOURCE_LABEL[source]}</span>
            </div>

            <div className="flex flex-col gap-2 border-t pt-4">
              {summary.length === 0 ? (
                <p className="text-sm text-muted-foreground">No services selected yet.</p>
              ) : (
                summary.map((row) => (
                  <div key={row.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-foreground">{row.serviceName || "Unnamed service"}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {row.priceRupees.trim()
                        ? formatMoney(Number(rupeesToPaise(row.priceRupees) || 0))
                        : "—"}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <span className="font-medium">Total</span>
              <span className="text-xl font-semibold">{formatMoney(totalPaise)}</span>
            </div>

            {error ? (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 pt-1">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Closing…" : "Close sale"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/enquiries/${enquiryId}`)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
