import type { ComponentType } from "react";
import { STAT_COLOR_CLASSES, type StatColor } from "@/components/dashboard/dashboard-colors";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** A single number card — the base unit of every role's dashboard: label + icon chip up top,
 * the value large below, with an optional muted sub-line for secondary context. */
export function StatCard({
  label,
  value,
  subLabel,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  subLabel?: string;
  icon: ComponentType<{ className?: string }>;
  color: StatColor;
}) {
  const classes = STAT_COLOR_CLASSES[color];
  return (
    <Card className="gap-2 py-4">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              classes.chip,
            )}
          >
            <Icon className="size-4.5" />
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-2xl font-semibold">{value}</span>
          {subLabel ? <span className="text-xs text-muted-foreground">{subLabel}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
