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
    <Card className={cn("border-l-4", classes.border)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full",
              classes.chip,
            )}
          >
            <Icon className="size-4" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("flex flex-col gap-2 text-sm", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
