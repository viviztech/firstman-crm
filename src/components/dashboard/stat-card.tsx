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
    <Card className="group gap-2 overflow-hidden border-pink-100/80 py-4 shadow-[0_12px_30px_-26px_rgba(107,28,64,0.45)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-[0_16px_35px_-24px_rgba(107,28,64,0.4)]">
      <CardContent className="flex min-w-0 flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-semibold text-slate-500">{label}</span>
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
              classes.chip,
            )}
          >
            <Icon className="size-4.5" aria-hidden="true" />
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="truncate text-2xl font-bold tracking-[-0.03em] text-[#0b203a] tabular-nums">
            {value}
          </span>
          {subLabel ? <span className="text-xs text-muted-foreground">{subLabel}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
