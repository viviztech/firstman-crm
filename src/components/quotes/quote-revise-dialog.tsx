"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { reviseQuoteAction } from "@/actions/quotes";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { formatMoney, paiseToRupees, rupeesToPaise } from "@/lib/money";

/** GST is charged only on this exact line label — mirrors TAXABLE_LINE_LABEL in
 *  services/quotes.ts and quote-document.tsx, so the live preview here matches what the
 *  server actually computes. */
const TAXABLE_LINE_LABEL = "Professional fee";

type LineItemRow = { id: string; label: string; qty: string; rateRupees: string };

function emptyRow(): LineItemRow {
  return { id: crypto.randomUUID(), label: "", qty: "1", rateRupees: "0" };
}

function computeAmount(item: LineItemRow): number {
  const qty = Number(item.qty);
  const ratePaise = Number(rupeesToPaise(item.rateRupees) || "0");
  if (!Number.isFinite(qty) || !Number.isFinite(ratePaise)) return 0;
  return Math.round(qty * ratePaise);
}

export function QuoteReviseDialog({
  quoteId,
  enquiryId,
  quoteNo,
  defaultLineItems,
  defaultGstRate,
}: {
  quoteId: string;
  enquiryId: string;
  quoteNo: string;
  defaultLineItems: { label: string; qty: number; ratePaise: number }[];
  defaultGstRate: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<LineItemRow[]>(() =>
    defaultLineItems.map((item) => ({
      id: crypto.randomUUID(),
      label: item.label,
      qty: String(item.qty),
      rateRupees: paiseToRupees(item.ratePaise),
    })),
  );
  const [gstRate, setGstRate] = useState(String(defaultGstRate));
  const [sendToClient, setSendToClient] = useState(true);

  const action = reviseQuoteAction.bind(null, quoteId, enquiryId);
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  function updateItem(id: string, patch: Partial<LineItemRow>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyRow()]);
  }

  function removeItem(id: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  }

  const subtotalPaise = items.reduce((sum, item) => sum + computeAmount(item), 0);
  const taxableBasePaise = items
    .filter((item) => item.label.trim() === TAXABLE_LINE_LABEL)
    .reduce((sum, item) => sum + computeAmount(item), 0);
  const gstAmountPaise = Math.round((taxableBasePaise * Number(gstRate)) / 100);
  const totalPaise = subtotalPaise + gstAmountPaise;

  const lineItemsJson = JSON.stringify(
    items
      .filter((item) => item.label.trim().length > 0)
      .map((item) => ({
        label: item.label,
        qty: item.qty,
        ratePaise: rupeesToPaise(item.rateRupees) || "0",
      })),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Edit</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Revise {quoteNo}</DialogTitle>
          <DialogDescription>
            Adjust the fee breakdown below. This creates a new quote — the original stays on file
            unchanged. GST applies only to the "{TAXABLE_LINE_LABEL}" line.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="lineItemsJson" value={lineItemsJson} />
          <input type="hidden" name="sendToClient" value={sendToClient ? "true" : "false"} />

          <div className="flex flex-col gap-2">
            <Label>Fee components</Label>
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 items-center gap-2">
                  <Input
                    className="col-span-6"
                    placeholder="Fee component"
                    value={item.label}
                    onChange={(event) => updateItem(item.id, { label: event.target.value })}
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    min={0}
                    step="any"
                    placeholder="Qty"
                    value={item.qty}
                    onChange={(event) => updateItem(item.id, { qty: event.target.value })}
                  />
                  <Input
                    className="col-span-3"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Rate (₹)"
                    value={item.rateRupees}
                    onChange={(event) => updateItem(item.id, { rateRupees: event.target.value })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="col-span-1"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length <= 1}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
            <div>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                Add fee component
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="revise-gst-rate">GST rate (on "{TAXABLE_LINE_LABEL}" only)</Label>
            <Select
              name="gstRate"
              value={gstRate}
              onValueChange={(value) => value && setGstRate(value)}
              items={[
                { value: "0", label: "0%" },
                { value: "18", label: "18%" },
              ]}
            >
              <SelectTrigger id="revise-gst-rate" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0%</SelectItem>
                <SelectItem value="18">18%</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(subtotalPaise)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST ({gstRate}%)</span>
              <span>{formatMoney(gstAmountPaise)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>{formatMoney(totalPaise)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="revise-send-to-client"
              checked={sendToClient}
              onCheckedChange={(checked) => setSendToClient(checked === true)}
            />
            <Label htmlFor="revise-send-to-client" className="font-normal">
              Send the revised quote to the client (WhatsApp + email)
            </Label>
          </div>

          {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save revision"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
