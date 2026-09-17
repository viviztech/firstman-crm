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
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, ListIcon } from "lucide-react";
import Link from "next/link";
import { toScope } from "@/actions/shared";
import { CompliancePageHeader } from "@/components/compliance/compliance-page-header";
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
  const items = await listComplianceItemsForRange(await toScope(user), gridStart, gridEnd);

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
    <div className="compliance-workflow flex min-w-0 flex-col gap-5">
      <CompliancePageHeader
        title="Compliance calendar"
        description="See statutory deadlines in context and move between filing months."
        icon={CalendarDaysIcon}
      />

      <div className="flex flex-col gap-3 rounded-xl border border-pink-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-pink-600 uppercase">
            Filing month
          </p>
          <h2 className="mt-0.5 text-xl font-bold tracking-tight text-[#0b203a]">
            {format(monthStart, "MMMM yyyy")}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/compliance" />}>
            <ListIcon className="size-4" aria-hidden="true" />
            List view
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/compliance/calendar?month=${prevMonth}`} />}
          >
            <ChevronLeftIcon className="size-4" aria-hidden="true" />
            Previous
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/compliance/calendar?month=${nextMonth}`} />}
          >
            Next
            <ChevronRightIcon className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto rounded-2xl border border-pink-100 bg-white shadow-sm">
        <div className="grid min-w-[760px] grid-cols-7 gap-px overflow-hidden bg-pink-100 text-sm">
          {WEEKDAY_LABELS.map((day) => (
            <div
              key={day}
              className="bg-pink-50 px-2 py-2 text-center text-xs font-semibold text-pink-800"
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
                className={`flex min-h-28 flex-col gap-1.5 bg-white p-2 ${inMonth ? "" : "opacity-40"}`}
              >
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-xs ${today ? "bg-pink-600 font-semibold text-white" : "text-slate-500"}`}
                >
                  {format(day, "d")}
                </span>
                {dayItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/compliance/${item.id}`}
                    className="truncate rounded-md border border-pink-100 bg-pink-50 px-1.5 py-1 text-xs font-medium text-pink-800 hover:bg-pink-100"
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
    </div>
  );
}
