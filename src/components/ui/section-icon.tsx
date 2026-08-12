import type { ComponentType } from "react";
import { STAT_COLOR_CLASSES, type StatColor } from "@/components/dashboard/dashboard-colors";
import { cn } from "@/lib/utils";

/** Small colored icon chip for card/section headers — reuses the same accent palette as
 * StatCard so a detail page's section headers read as one coherent color system. */
export function SectionIcon({
  icon: Icon,
  color,
}: {
  icon: ComponentType<{ className?: string }>;
  color: StatColor;
}) {
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md",
        STAT_COLOR_CLASSES[color].chip,
      )}
    >
      <Icon className="size-3.5" />
    </span>
  );
}
