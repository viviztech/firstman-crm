"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { deleteServiceStatePriceAction, setServiceStatePriceAction } from "@/actions/catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { formatMoney } from "@/lib/money";

type StateOption = { id: string; name: string };
type FeeComponent = {
  label: string;
  amountPaise: number;
  perDirector: boolean;
  perLakhCapital: boolean;
};
type StatePriceRow = {
  id: string;
  stateId: string;
  stateName: string;
  feeComponents: FeeComponent[];
  updatedAt: Date;
};

type ComponentRow = {
  key: string;
  label: string;
  amountRupees: string;
  perDirector: boolean;
  perLakhCapital: boolean;
};

function emptyComponentRow(): ComponentRow {
  return {
    key: crypto.randomUUID(),
    label: "",
    amountRupees: "",
    perDirector: false,
    perLakhCapital: false,
  };
}

function toComponentRows(feeComponents: FeeComponent[]): ComponentRow[] {
  if (feeComponents.length === 0) {
    return [emptyComponentRow()];
  }
  return feeComponents.map((item) => ({
    key: crypto.randomUUID(),
    label: item.label,
    amountRupees: String(item.amountPaise / 100),
    perDirector: item.perDirector,
    perLakhCapital: item.perLakhCapital,
  }));
}

/**
 * Manages per-state fee breakdowns for a service (e.g. Pvt Ltd registration's Name Approval/
 * DSC/DIN/SPICe/MOA/AOA components, which differ by state — ADR 0010). A state with no row here
 * falls back to the service's flat base/govt fee when a quote is generated.
 */
export function ServiceStatePricingEditor({
  serviceId,
  statePrices,
  states,
}: {
  serviceId: string;
  statePrices: StatePriceRow[];
  states: StateOption[];
}) {
  const [dialogRow, setDialogRow] = useState<StatePriceRow | "new" | null>(null);
  const configuredStateIds = new Set(statePrices.map((row) => row.stateId));

  return (
    <Card className="max-w-3xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm text-muted-foreground">State-wise pricing</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setDialogRow("new")}>
          Add state pricing
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {statePrices.length === 0 ? (
          <p className="text-muted-foreground">
            No state-specific pricing configured yet — quotes for this service use the flat base
            price and govt. fee above for every state.
          </p>
        ) : (
          statePrices.map((row) => (
            <StatePriceListRow
              key={row.id}
              row={row}
              serviceId={serviceId}
              onEdit={() => setDialogRow(row)}
            />
          ))
        )}
      </CardContent>

      {dialogRow ? (
        <StatePriceFormDialog
          serviceId={serviceId}
          row={dialogRow === "new" ? null : dialogRow}
          states={
            dialogRow === "new"
              ? states.filter((state) => !configuredStateIds.has(state.id))
              : states
          }
          onClose={() => setDialogRow(null)}
        />
      ) : null}
    </Card>
  );
}

function StatePriceListRow({
  row,
  serviceId,
  onEdit,
}: {
  row: StatePriceRow;
  serviceId: string;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const total = row.feeComponents.reduce((sum, item) => sum + item.amountPaise, 0);
  const perDirectorCount = row.feeComponents.filter((item) => item.perDirector).length;
  const perLakhCapitalCount = row.feeComponents.filter((item) => item.perLakhCapital).length;

  function handleDelete() {
    startTransition(async () => {
      await deleteServiceStatePriceAction(serviceId, row.stateId);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
      <div>
        <span className="font-medium">{row.stateName}</span>
        <span className="ml-2 text-muted-foreground">
          {row.feeComponents.length} component{row.feeComponents.length === 1 ? "" : "s"}
          {perDirectorCount > 0 ? ` (${perDirectorCount} per director/partner)` : ""}
          {perLakhCapitalCount > 0 ? ` (${perLakhCapitalCount} per lakh capital)` : ""} —{" "}
          {formatMoney(total)}
        </span>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={handleDelete}>
          Remove
        </Button>
      </div>
    </div>
  );
}

function StatePriceFormDialog({
  serviceId,
  row,
  states,
  onClose,
}: {
  serviceId: string;
  row: StatePriceRow | null;
  states: StateOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    setServiceStatePriceAction.bind(null, serviceId),
    undefined,
  );
  const [stateId, setStateId] = useState(row?.stateId ?? states[0]?.id ?? "");
  const [rows, setRows] = useState<ComponentRow[]>(() => toComponentRows(row?.feeComponents ?? []));

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onClose();
    }
  }, [state, router, onClose]);

  function addRow() {
    setRows((prev) => [...prev, emptyComponentRow()]);
  }
  function updateRow(key: string, patch: Partial<ComponentRow>) {
    setRows((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }
  function removeRow(key: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((item) => item.key !== key) : prev));
  }

  const feeComponents = rows
    .filter((item) => item.label.trim() && item.amountRupees.trim())
    .map((item) => ({
      label: item.label.trim(),
      amountPaise: Math.round(Number(item.amountRupees) * 100) || 0,
      perDirector: item.perDirector,
      perLakhCapital: item.perLakhCapital,
    }));
  const total = feeComponents.reduce((sum, item) => sum + item.amountPaise, 0);

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{row ? `Edit pricing — ${row.stateName}` : "Add state pricing"}</DialogTitle>
          <DialogDescription>
            The quote always leads with the service's own Professional fee (set above) — these rows
            are the government-side fees layered on top of it (e.g. Name Approval, DSC, DIN, SPICe
            Form, MOA, AOA), so don't add a row for the professional fee itself. Mark "Per director"
            for fees like DSC/DIN charged once per director/partner, or "Per lakh capital" for fees
            like MOA/AOA stamp duty charged per ₹1,00,000 of authorized capital — the amount below
            is the rate for one unit either way.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          {row ? <input type="hidden" name="stateId" value={stateId} /> : null}
          <input type="hidden" name="feeComponents" value={JSON.stringify(feeComponents)} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="state-price-state">
              State <span className="text-destructive">*</span>
            </Label>
            {row ? (
              <Input id="state-price-state" value={row.stateName} disabled />
            ) : (
              <Select
                name="stateId"
                value={stateId}
                onValueChange={(value) => setStateId(value ?? "")}
                items={states.map((s) => ({ value: s.id, label: s.name }))}
              >
                <SelectTrigger id="state-price-state" className="w-full">
                  <SelectValue placeholder="Choose a state" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-lg border p-3">
            <span className="text-sm font-medium">Fee components</span>
            {rows.map((item) => (
              <div
                key={item.key}
                className="flex flex-col gap-1.5 border-b pb-2 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="e.g. Name Approval"
                    value={item.label}
                    onChange={(e) => updateRow(item.key, { label: e.target.value })}
                    className="flex-1"
                  />
                  <div className="relative w-32">
                    <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Amount"
                      className="pl-6"
                      value={item.amountRupees}
                      onChange={(e) => updateRow(item.key, { amountRupees: e.target.value })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(item.key)}
                    disabled={rows.length <= 1}
                  >
                    Remove
                  </Button>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Checkbox
                      id={`per-director-${item.key}`}
                      checked={item.perDirector}
                      onCheckedChange={(checked) =>
                        updateRow(item.key, { perDirector: checked === true })
                      }
                    />
                    <Label
                      htmlFor={`per-director-${item.key}`}
                      className="text-xs font-normal text-muted-foreground"
                    >
                      Per director
                    </Label>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Checkbox
                      id={`per-lakh-capital-${item.key}`}
                      checked={item.perLakhCapital}
                      onCheckedChange={(checked) =>
                        updateRow(item.key, { perLakhCapital: checked === true })
                      }
                    />
                    <Label
                      htmlFor={`per-lakh-capital-${item.key}`}
                      className="text-xs font-normal text-muted-foreground"
                    >
                      Per lakh capital
                    </Label>
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={addRow}>
              Add component
            </Button>
            <p className="text-sm font-medium">
              Total (1 director/partner, ₹1L capital): {formatMoney(total)}
            </p>
          </div>

          {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={isPending || !stateId || feeComponents.length === 0}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
