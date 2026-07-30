import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/session";
import { listComplianceItemsForRange } from "@/services/compliance";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function ComplianceCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireRole("super_admin", "manager", "executive");
  const { month } = await searchParams;

  const anchor =
    month && /^\d{4}-\d{2}$/.test(month) ? new Date(`${month}-01T00:00:00`) : new Date();
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);

  const items = await listComplianceItemsForRange(
    { userId: user.id, role: user.role },
    gridStart,
    gridEnd,
  );

  const itemsByDay = new Map<string, typeof items>();
  for (const item of items) {
    const key = format(new Date(item.dueDate), "yyyy-MM-dd");
    const existing = itemsByDay.get(key);
    if (existing) existing.push(item);
    else itemsByDay.set(key, [item]);
  }

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const prevMonth = format(subMonths(monthStart, 1), "yyyy-MM");
  const nextMonth = format(addMonths(monthStart, 1), "yyyy-MM");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Compliance — Calendar</h1>
          <p className="text-sm text-muted-foreground">{format(monthStart, "MMMM yyyy")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/compliance" />}>
            List view
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/compliance/calendar?month=${prevMonth}`} />}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/compliance/calendar?month=${nextMonth}`} />}
          >
            Next
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border text-sm">
        {WEEKDAY_LABELS.map((day) => (
          <div
            key={day}
            className="bg-muted px-2 py-1 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayItems = itemsByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, monthStart);
          const today = isSameDay(day, new Date());
          return (
            <div
              key={key}
              className={`flex min-h-24 flex-col gap-1 bg-background p-1.5 ${inMonth ? "" : "opacity-40"}`}
            >
              <span
                className={`text-xs ${today ? "font-semibold text-primary" : "text-muted-foreground"}`}
              >
                {format(day, "d")}
              </span>
              {dayItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/compliance/${item.id}`}
                  className="truncate rounded bg-muted px-1 py-0.5 text-xs hover:bg-muted/70"
                  title={`${item.title} — ${item.clientName}`}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
