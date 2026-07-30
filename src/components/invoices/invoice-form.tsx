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
type OrderOption = { id: string; orderNo: string; clientId: string };

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

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
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
          >
            <SelectTrigger id="orderId" className="w-full">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {availableOrders.map((order) => (
                <SelectItem key={order.id} value={order.id}>
                  {order.orderNo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <InvoiceLineItemsEditor />

      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor="dueDate">
          Due date <span className="text-destructive">*</span>
        </Label>
        <Input id="dueDate" name="dueDate" type="date" required />
      </div>

      {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create invoice"}
        </Button>
      </div>
    </form>
  );
}
