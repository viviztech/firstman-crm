"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import type { ActionResult } from "@/actions/shared";
import { InvoiceLineItemsEditor } from "@/components/invoices/invoice-line-items-editor";
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

type ClientOption = { id: string; name: string; phone: string };
type OrderOption = {
  id: string;
  orderNo: string;
  clientId: string;
  serviceName: string;
  quotedPricePaise: number;
  govtFeePaise: number | null;
};

/** Default due window when nothing more specific is known — 15 days is the common norm for
 * this business's invoices (proforma invoices default to 7 days at time of sale instead). */
function defaultDueDate(): string {
  const due = new Date();
  due.setDate(due.getDate() + 15);
  return due.toISOString().slice(0, 10);
}

export function InvoiceForm({
  action,
  clients,
  orders,
  defaultClientId,
  defaultOrderId,
}: {
  action: (
    prev: ActionResult<{ id: string }> | undefined,
    formData: FormData,
  ) => Promise<ActionResult<{ id: string }>>;
  clients: ClientOption[];
  orders: OrderOption[];
  defaultClientId?: string;
  defaultOrderId?: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, undefined);
  const [clientId, setClientId] = useState(defaultClientId ?? clients[0]?.id);
  const [orderId, setOrderId] = useState(defaultOrderId ?? "");

  useEffect(() => {
    if (state?.ok) {
      router.push(`/invoices/${state.data?.id}`);
    }
  }, [state, router]);

  const availableOrders = useMemo(
    () => orders.filter((order) => !clientId || order.clientId === clientId),
    [orders, clientId],
  );

  const selectedOrder = orders.find((order) => order.id === orderId);
  const orderLineItems = useMemo(() => {
    if (!selectedOrder) return undefined;
    return [
      { description: selectedOrder.serviceName, qty: 1, ratePaise: selectedOrder.quotedPricePaise },
      ...(selectedOrder.govtFeePaise
        ? [{ description: "Government fee", qty: 1, ratePaise: selectedOrder.govtFeePaise }]
        : []),
    ];
  }, [selectedOrder]);

  return (
    <form
      action={formAction}
      className="flex w-full flex-col gap-5 rounded-2xl border border-pink-100 bg-white p-4 shadow-[0_18px_45px_-36px_rgba(107,28,64,0.45)] sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="clientId">
            Client <span className="text-destructive">*</span>
          </Label>
          <Select
            name="clientId"
            value={clientId}
            onValueChange={(value) => {
              if (!value) return;
              setClientId(value);
              setOrderId("");
            }}
            items={clients.map((client) => ({
              value: client.id,
              label: `${client.name} · ${client.phone}`,
            }))}
          >
            <SelectTrigger id="clientId" className="w-full">
              <SelectValue placeholder="Choose a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name} · {client.phone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="orderId">Linked order</Label>
          <Select
            name="orderId"
            value={orderId || undefined}
            onValueChange={(value) => setOrderId(value ?? "")}
            items={availableOrders.map((order) => ({
              value: order.id,
              label: `${order.orderNo} — ${order.serviceName}`,
            }))}
          >
            <SelectTrigger id="orderId" className="w-full">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {availableOrders.map((order) => (
                <SelectItem key={order.id} value={order.id}>
                  {order.orderNo} — {order.serviceName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <InvoiceLineItemsEditor key={orderId || "none"} defaultItems={orderLineItems} />

      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor="dueDate">
          Due date <span className="text-destructive">*</span>
        </Label>
        <Input id="dueDate" name="dueDate" type="date" required defaultValue={defaultDueDate()} />
      </div>

      {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div className="flex justify-end border-t border-pink-100 pt-5">
        <Button type="submit" className="min-w-40" disabled={isPending}>
          {isPending ? "Creating…" : "Create invoice"}
        </Button>
      </div>
    </form>
  );
}
