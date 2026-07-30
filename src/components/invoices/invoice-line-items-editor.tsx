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
import { formatMoney } from "@/lib/money";

type LineItemRow = { id: string; description: string; qty: string; ratePaise: string };

function emptyRow(): LineItemRow {
  return { id: crypto.randomUUID(), description: "", qty: "1", ratePaise: "0" };
}

function computeAmount(item: LineItemRow): number {
  const qty = Number(item.qty);
  const rate = Number(item.ratePaise);
  if (!Number.isFinite(qty) || !Number.isFinite(rate)) return 0;
  return Math.round(qty * rate);
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
          ratePaise: String(item.ratePaise),
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
        ratePaise: item.ratePaise,
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
                placeholder="Rate (paise)"
                value={item.ratePaise}
                onChange={(event) => updateItem(item.id, { ratePaise: event.target.value })}
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
