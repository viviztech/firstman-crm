"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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

type LineItemRow = { id: string; description: string; qty: string; rateRupees: string };

function emptyRow(): LineItemRow {
  return { id: crypto.randomUUID(), description: "", qty: "1", rateRupees: "0" };
}

function computeAmount(item: LineItemRow): number {
  const qty = Number(item.qty);
  const ratePaise = Number(rupeesToPaise(item.rateRupees) || "0");
  if (!Number.isFinite(qty) || !Number.isFinite(ratePaise)) return 0;
  return Math.round(qty * ratePaise);
}

export function InvoiceLineItemsEditor({
  defaultItems,
  defaultGstRate = 18,
}: {
  defaultItems?: { description: string; qty: number; ratePaise: number }[];
  defaultGstRate?: number;
}) {
  const [items, setItems] = useState<LineItemRow[]>(() =>
    defaultItems && defaultItems.length > 0
      ? defaultItems.map((item) => ({
          id: crypto.randomUUID(),
          description: item.description,
          qty: String(item.qty),
          rateRupees: paiseToRupees(item.ratePaise),
        }))
      : [emptyRow()],
  );
  const [gstRate, setGstRate] = useState(String(defaultGstRate));

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
  const gstAmountPaise = Math.round((subtotalPaise * Number(gstRate)) / 100);
  const totalPaise = subtotalPaise + gstAmountPaise;

  const lineItemsJson = JSON.stringify(
    items
      .filter((item) => item.description.trim().length > 0)
      .map((item) => ({
        description: item.description,
        qty: item.qty,
        ratePaise: rupeesToPaise(item.rateRupees) || "0",
      })),
  );

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="lineItemsJson" value={lineItemsJson} />

      <div className="flex flex-col gap-2">
        <Label>Line items</Label>
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div key={item.id} className="grid grid-cols-12 items-center gap-2">
              <Input
                className="col-span-6"
                placeholder="Description"
                value={item.description}
                onChange={(event) => updateItem(item.id, { description: event.target.value })}
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
            Add line item
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="gstRate">GST rate</Label>
          <Select
            name="gstRate"
            value={gstRate}
            onValueChange={(value) => value && setGstRate(value)}
            items={[
              { value: "0", label: "0%" },
              { value: "18", label: "18%" },
            ]}
          >
            <SelectTrigger id="gstRate" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0%</SelectItem>
              <SelectItem value="18">18%</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
    </div>
  );
}
