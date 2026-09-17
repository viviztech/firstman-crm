import type { ComponentType, ReactNode } from "react";
import { STAT_COLOR_CLASSES, type StatColor } from "@/components/dashboard/dashboard-colors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Same colored-accent language as StatCard (left border + icon chip), for dashboard cards that
 * hold a list or chart rather than a single number — keeps every card on a role's dashboard
 * visually consistent instead of only the top stat row being colorful.
 */
export function SectionCard({
  title,
  icon: Icon,
  color,
  children,
  contentClassName,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  color: StatColor;
  children: ReactNode;
  contentClassName?: string;
}) {
  const classes = STAT_COLOR_CLASSES[color];
  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden border-pink-100/80 py-0 shadow-[0_14px_35px_-28px_rgba(107,28,64,0.4)]",
        classes.border,
      )}
    >
      <CardHeader className="border-b border-pink-50 bg-gradient-to-r from-slate-50/90 to-white px-5 py-4">
        <CardTitle className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              classes.chip,
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("flex flex-col gap-2 px-5 py-4 text-sm", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
