"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { recordPaymentAction } from "@/actions/invoices";
import { Button } from "@/components/ui/button";
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
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { paymentMethodEnum } from "@/db/schema/invoices";
import { PAYMENT_METHOD_LABEL } from "@/lib/badges";
import { formatMoney } from "@/lib/money";

export function RecordPaymentDialog({
  invoiceId,
  balancePaise,
}: {
  invoiceId: string;
  balancePaise: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const boundAction = recordPaymentAction.bind(null, invoiceId);
  const [state, formAction, isPending] = useActionState(boundAction, undefined);

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Record payment</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>Balance due: {formatMoney(balancePaise)}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="amountPaise">
              Amount (₹) <span className="text-destructive">*</span>
            </Label>
            <MoneyInput
              id="amountPaise"
              name="amountPaise"
              min={0.01}
              required
              defaultValuePaise={balancePaise}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="method">
              Method <span className="text-destructive">*</span>
            </Label>
            <Select
              name="method"
              defaultValue="upi"
              items={paymentMethodEnum.enumValues.map((value) => ({
                value,
                label: PAYMENT_METHOD_LABEL[value],
              }))}
            >
              <SelectTrigger id="method" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethodEnum.enumValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {PAYMENT_METHOD_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reference">Reference</Label>
            <Input id="reference" name="reference" placeholder="Transaction ID, cheque no., etc." />
          </div>
          {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Recording…" : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
