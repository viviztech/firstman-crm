import { Badge } from "@/components/ui/badge";
import { ENQUIRY_STATUS_BADGE, type EnquiryStatus } from "@/lib/badges";
import { cn } from "@/lib/utils";

export function EnquiryStatusBadge({
  status,
  className,
}: {
  status: EnquiryStatus;
  className?: string;
}) {
  const { label, className: colorClassName } = ENQUIRY_STATUS_BADGE[status];
  return <Badge className={cn(colorClassName, className)}>{label}</Badge>;
}
