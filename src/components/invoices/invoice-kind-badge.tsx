import { Badge } from "@/components/ui/badge";
import { INVOICE_KIND_BADGE, type InvoiceKind } from "@/lib/badges";
import { cn } from "@/lib/utils";

export function InvoiceKindBadge({ kind, className }: { kind: InvoiceKind; className?: string }) {
  const { label, className: colorClassName } = INVOICE_KIND_BADGE[kind];
  return <Badge className={cn(colorClassName, className)}>{label}</Badge>;
}
