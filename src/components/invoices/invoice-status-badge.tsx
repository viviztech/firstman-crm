import { Badge } from "@/components/ui/badge";
import { INVOICE_STATUS_BADGE, type InvoiceStatus } from "@/lib/badges";
import { cn } from "@/lib/utils";

export function InvoiceStatusBadge({
  status,
  className,
}: {
  status: InvoiceStatus;
  className?: string;
}) {
  const { label, className: colorClassName } = INVOICE_STATUS_BADGE[status];
  return <Badge className={cn(colorClassName, className)}>{label}</Badge>;
}
