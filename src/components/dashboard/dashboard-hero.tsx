import { formatInTimeZone } from "date-fns-tz";
import { ArrowUpRightIcon, CalendarDaysIcon, SparklesIcon } from "lucide-react";
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
  roleLabel,
}: {
  userName: string;
  roleLabel?: string;
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
    <section className="relative overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-[0_18px_45px_-32px_rgba(107,28,64,0.35)]">
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] lg:block"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(186 42 102 / 0.16) 1.5px, transparent 0)",
          backgroundSize: "24px 24px",
          maskImage: "linear-gradient(to left, black 15%, transparent 95%)",
        }}
      />
      <div className="pointer-events-none absolute -right-16 -top-28 size-64 rounded-full bg-pink-100/70 blur-2xl" />
      <div className="pointer-events-none absolute right-48 -bottom-28 size-52 rounded-full bg-pink-50/80 blur-2xl" />
      <div className="relative grid gap-7 px-5 py-7 sm:px-8 sm:py-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            {roleLabel ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-50 px-2.5 py-1 text-pink-700 ring-1 ring-pink-100">
                <SparklesIcon className="size-3" aria-hidden="true" />
                {roleLabel}
              </span>
            ) : null}
            <span className="flex items-center gap-1.5">
              <CalendarDaysIcon className="size-3.5" aria-hidden="true" />
              {formatInTimeZone(now, env.TZ_DISPLAY, "EEEE, d MMMM yyyy")}
            </span>
          </div>
          <h1 className="text-pretty text-2xl font-bold tracking-[-0.035em] text-[#0b203a] sm:text-3xl">
            {greetingFor(now)}, {userName.split(" ")[0]}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Your pipeline, delivery work, and deadlines are in one clear view.
          </p>
        </div>

        {headline && classes ? (
          <div className="flex min-w-64 items-center gap-3 rounded-xl border border-pink-100 bg-pink-50/70 p-4 shadow-sm backdrop-blur-sm">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-pink-100",
                classes.chip,
              )}
            >
              <headline.icon className="size-5" aria-hidden="true" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="text-xs font-medium text-slate-500">{headline.label}</span>
              <span className="truncate text-2xl font-bold tracking-tight text-[#0b203a] tabular-nums">
                {headline.value}
              </span>
            </div>
            <ArrowUpRightIcon className="ml-auto size-4 text-pink-600" aria-hidden="true" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
