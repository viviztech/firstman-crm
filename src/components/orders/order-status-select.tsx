"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { updateOrderStatusAction } from "@/actions/orders";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { orderStatusEnum } from "@/db/schema/orders";
import { ORDER_STATUS_BADGE, type OrderStatus } from "@/lib/badges";

export function OrderStatusSelect({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value || value === status) return;
    startTransition(async () => {
      const result = await updateOrderStatusAction(orderId, value);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {orderStatusEnum.enumValues.map((value) => (
          <SelectItem key={value} value={value}>
            {ORDER_STATUS_BADGE[value].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
