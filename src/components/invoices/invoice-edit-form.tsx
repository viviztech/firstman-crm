"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
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

type OrderOption = { id: string; orderNo: string };

function toDateInputValue(value: Date | string): string {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function InvoiceEditForm({
  action,
  invoiceId,
  orders,
  defaultValues,
}: {
  action: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  invoiceId: string;
  orders: OrderOption[];
  defaultValues: {
    orderId: string | null;
    lineItems: { description: string; qty: number; ratePaise: number }[];
    gstRate: number;
    dueDate: Date | string;
  };
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.ok) {
      router.push(`/invoices/${invoiceId}`);
    }
  }, [state, router, invoiceId]);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor="orderId">Linked order</Label>
        <Select
          name="orderId"
          defaultValue={defaultValues.orderId ?? undefined}
          items={orders.map((order) => ({ value: order.id, label: order.orderNo }))}
        >
          <SelectTrigger id="orderId" className="w-full">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            {orders.map((order) => (
              <SelectItem key={order.id} value={order.id}>
                {order.orderNo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <InvoiceLineItemsEditor
        defaultItems={defaultValues.lineItems}
        defaultGstRate={defaultValues.gstRate}
      />

      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor="dueDate">
          Due date <span className="text-destructive">*</span>
        </Label>
        <Input
          id="dueDate"
          name="dueDate"
          type="date"
          required
          defaultValue={toDateInputValue(defaultValues.dueDate)}
        />
      </div>

      {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
