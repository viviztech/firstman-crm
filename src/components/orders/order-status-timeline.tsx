import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_BADGE, type OrderStatus } from "@/lib/badges";
import { cn } from "@/lib/utils";

// The linear "happy path" — on_hold/cancelled are exceptions, shown as a badge instead of a step.
const HAPPY_PATH: OrderStatus[] = [
  "pending",
  "docs_awaited",
  "in_progress",
  "govt_processing",
  "completed",
];

export function OrderStatusTimeline({ status }: { status: OrderStatus }) {
  if (status === "on_hold" || status === "cancelled") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Timeline paused —</span>
        <Badge className={ORDER_STATUS_BADGE[status].className}>
          {ORDER_STATUS_BADGE[status].label}
        </Badge>
      </div>
    );
  }

  const currentIndex = HAPPY_PATH.indexOf(status);

  return (
    <ol className="flex flex-wrap items-center gap-1" aria-label="Order status timeline">
      {HAPPY_PATH.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li key={step} className="flex items-center gap-1">
            <span
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium",
                isCurrent && ORDER_STATUS_BADGE[step].className,
                isDone && "bg-muted text-muted-foreground",
                !isCurrent && !isDone && "bg-muted/50 text-muted-foreground/60",
              )}
            >
              {ORDER_STATUS_BADGE[step].label}
            </span>
            {index < HAPPY_PATH.length - 1 ? (
              <span className="text-muted-foreground/50" aria-hidden="true">
                →
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
