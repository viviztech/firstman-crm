import { Badge } from "@/components/ui/badge";
import { LEAD_STATUS_BADGE, type LeadStatus } from "@/lib/badges";
import { cn } from "@/lib/utils";

export function LeadStatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  const { label, className: colorClassName } = LEAD_STATUS_BADGE[status];
  return <Badge className={cn(colorClassName, className)}>{label}</Badge>;
}
