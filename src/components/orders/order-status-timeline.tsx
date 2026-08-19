import { CircleCheckBig } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_BADGE, ORDER_STATUS_STEP_RING, type OrderStatus } from "@/lib/badges";
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
    <ol className="flex flex-wrap items-start" aria-label="Job card status timeline">
      {HAPPY_PATH.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li key={step} className="flex items-start">
            <div className="flex flex-col items-center gap-1.5">
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                  isDone && "border-green-500 bg-green-500 text-white",
                  isCurrent && cn("shadow-sm", ORDER_STATUS_STEP_RING[step]),
                  !isCurrent && !isDone && "border-border bg-muted text-muted-foreground/50",
                )}
              >
                {isDone ? <CircleCheckBig className="size-4" /> : index + 1}
              </span>
              <span
                className={cn(
                  "max-w-16 text-center text-[11px] leading-tight font-medium text-balance",
                  isCurrent ? "text-foreground" : "text-muted-foreground/70",
                )}
              >
                {ORDER_STATUS_BADGE[step].label}
              </span>
            </div>
            {index < HAPPY_PATH.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "mx-1.5 mt-3.5 h-0.5 w-6 shrink-0 rounded-full sm:w-10",
                  isDone ? "bg-green-500" : "bg-border",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
