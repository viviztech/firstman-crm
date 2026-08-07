"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import type { ActionResult } from "@/actions/shared";
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

type OrderOption = { id: string; orderNo: string };

function toDateInputValue(value: Date | string): string {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function ExpenseEditForm({
  action,
  orders,
  defaultValues,
}: {
  action: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  orders: OrderOption[];
  defaultValues: {
    date: Date | string;
    category: string;
    description: string | null;
    amountPaise: number;
    orderId: string | null;
  };
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.ok) {
      router.push("/expenses");
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="date">
            Date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={toDateInputValue(defaultValues.date)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="category">
            Category <span className="text-destructive">*</span>
          </Label>
          <Input id="category" name="category" required defaultValue={defaultValues.category} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="amountPaise">
          Amount (₹) <span className="text-destructive">*</span>
        </Label>
        <MoneyInput
          id="amountPaise"
          name="amountPaise"
          required
          defaultValuePaise={defaultValues.amountPaise}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="orderId">Related order</Label>
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={defaultValues.description ?? ""}
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
