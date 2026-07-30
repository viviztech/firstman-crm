import { Badge } from "@/components/ui/badge";
import { COMPLIANCE_STATUS_BADGE, type ComplianceStatus } from "@/lib/badges";
import { cn } from "@/lib/utils";

export function ComplianceStatusBadge({
  status,
  className,
}: {
  status: ComplianceStatus;
  className?: string;
}) {
  const { label, className: colorClassName } = COMPLIANCE_STATUS_BADGE[status];
  return <Badge className={cn(colorClassName, className)}>{label}</Badge>;
}
