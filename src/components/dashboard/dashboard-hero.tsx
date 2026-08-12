import { formatInTimeZone } from "date-fns-tz";
import type { ComponentType } from "react";
import { STAT_COLOR_CLASSES, type StatColor } from "@/components/dashboard/dashboard-colors";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

function greetingFor(now: Date): string {
  const hour = Number(formatInTimeZone(now, env.TZ_DISPLAY, "H"));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Gradient greeting banner at the top of the dashboard, with an optional role-specific headline
 * stat overlapping its bottom edge — populated from data the dashboard page already fetches. */
export function DashboardHero({
  userName,
  headline,
}: {
  userName: string;
  headline?: {
    label: string;
    value: string;
    icon: ComponentType<{ className?: string }>;
    color: StatColor;
  };
}) {
  const now = new Date();
  const classes = headline ? STAT_COLOR_CLASSES[headline.color] : null;

  return (
    <div className={cn("flex flex-col", headline ? "pb-8" : undefined)}>
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 px-6 py-6 text-primary-foreground">
        <p className="text-lg font-semibold">
          {greetingFor(now)}, {userName.split(" ")[0]}!
        </p>
        <p className="text-sm text-primary-foreground/80">
          {formatInTimeZone(now, env.TZ_DISPLAY, "EEE, d MMM yyyy")}
        </p>
      </div>

      {headline && classes ? (
        <div className="-mt-6 self-start px-6">
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                classes.chip,
              )}
            >
              <headline.icon className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">{headline.label}</span>
              <span className="text-xl font-semibold">{headline.value}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
