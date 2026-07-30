import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_BADGE, type OrderStatus } from "@/lib/badges";
import { cn } from "@/lib/utils";

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const { label, className: colorClassName } = ORDER_STATUS_BADGE[status];
  return <Badge className={cn(colorClassName, className)}>{label}</Badge>;
}
