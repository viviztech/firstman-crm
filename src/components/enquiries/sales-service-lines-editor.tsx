"use client";

import { useEffect, useState } from "react";
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
import { paiseToRupees, rupeesToPaise } from "@/lib/money";

type ServiceOption = {
  id: string;
  name: string;
  basePricePaise: number;
};

type ServiceLineRow = {
  id: string;
  serviceId: string;
  priceRupees: string;
};

/** A selected row, resolved to its service name — for a parent's live order summary. */
export type SalesServiceLineSummary = { id: string; serviceName: string; priceRupees: string };

function emptyRow(): ServiceLineRow {
  return { id: crypto.randomUUID(), serviceId: "", priceRupees: "" };
}

/**
 * A repeatable service-line picker for the Sales dialog: each row picks a service and its own
 * price, defaulted from the catalog when chosen (mirroring the pre-multi-service
 * `handleServiceChange` behavior, now per row). Govt. fee is deliberately not set here — it's
 * often not known precisely at the point of sale, and stays editable later on the job card
 * itself (order-edit-form.tsx) instead. One dedicated job card and one dedicated proforma
 * invoice gets created per row (ADR 0002) — never one combined proforma across services. Emits
 * a single hidden `servicesJson` field, since FormData has no native array encoding (mirrors
 * InvoiceLineItemsEditor's `lineItemsJson`).
 */
export function SalesServiceLinesEditor({
  services,
  defaultServiceId,
  onSummaryChange,
}: {
  services: ServiceOption[];
  defaultServiceId?: string | null;
  /** Optional — lets a parent page (e.g. a summary sidebar) mirror the selection without this
   * component giving up ownership of its own row state. Unused by callers that don't need it. */
  onSummaryChange?: (summary: SalesServiceLineSummary[]) => void;
}) {
  const [rows, setRows] = useState<ServiceLineRow[]>(() => {
    const initial = emptyRow();
    return [defaultServiceId ? { ...initial, serviceId: defaultServiceId } : initial];
  });

  useEffect(() => {
    onSummaryChange?.(
      rows
        .filter((row) => row.serviceId)
        .map((row) => ({
          id: row.id,
          serviceName: services.find((service) => service.id === row.serviceId)?.name ?? "",
          priceRupees: row.priceRupees,
        })),
    );
  }, [rows, services, onSummaryChange]);

  function updateRow(id: string, patch: Partial<ServiceLineRow>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function handleServiceChange(id: string, serviceId: string | null) {
    if (!serviceId) return;
    const service = services.find((candidate) => candidate.id === serviceId);
    updateRow(id, { serviceId, priceRupees: paiseToRupees(service?.basePricePaise) });
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : prev));
  }

  const servicesJson = JSON.stringify(
    rows
      .filter((row) => row.serviceId)
      .map((row) => ({
        serviceId: row.serviceId,
        quotedPricePaise: rupeesToPaise(row.priceRupees) || "0",
      })),
  );

  const hasAtLeastOneService = rows.some((row) => row.serviceId);

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="servicesJson" value={servicesJson} />

      <div className="flex flex-col gap-2">
        <Label>
          Services <span className="text-destructive">*</span>
        </Label>
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-12 items-center gap-2">
              <Select
                value={row.serviceId}
                onValueChange={(value) => handleServiceChange(row.id, value)}
                items={services.map((service) => ({ value: service.id, label: service.name }))}
              >
                <SelectTrigger className="col-span-7">
                  <SelectValue placeholder="Choose a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative col-span-4">
                <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
                  ₹
                </span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Price"
                  className="pl-6"
                  value={row.priceRupees}
                  onChange={(event) => updateRow(row.id, { priceRupees: event.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="col-span-1"
                onClick={() => removeRow(row.id)}
                disabled={rows.length <= 1}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
        <div>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            Add service
          </Button>
        </div>
        {!hasAtLeastOneService ? (
          <p className="text-sm text-muted-foreground">Choose at least one service.</p>
        ) : null}
      </div>
    </div>
  );
}
