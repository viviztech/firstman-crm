import { ENQUIRY_STATUS_BADGE, ENQUIRY_STATUS_ORDER } from "@/lib/badges";

const STAGE_STYLES = [
  "from-pink-700 to-pink-600",
  "from-pink-500 to-pink-400",
  "from-teal-500 to-teal-400",
  "from-amber-400 to-amber-300",
  "from-violet-500 to-violet-400",
  "from-emerald-500 to-emerald-400",
  "from-slate-500 to-slate-400",
];

export function EnquiriesFunnelChart({ data }: { data: { status: string; count: number }[] }) {
  const countByStatus = new Map(data.map((row) => [row.status, row.count]));
  const chartData = ENQUIRY_STATUS_ORDER.map((status, index) => ({
    status: ENQUIRY_STATUS_BADGE[status].label,
    count: countByStatus.get(status) ?? 0,
    style: STAGE_STYLES[index] ?? STAGE_STYLES[0],
  }));
  const total = chartData.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="flex flex-col gap-5 py-1">
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        {chartData.map((item) => (
          <span
            key={item.status}
            className={`min-w-1 bg-gradient-to-r ${item.style}`}
            style={{ width: `${total > 0 ? (item.count / total) * 100 : 100 / chartData.length}%` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4 xl:grid-cols-7">
        {chartData.map((item) => (
          <div key={item.status} className="relative border-l border-pink-100 pl-3">
            <span className={`mb-2 block h-1.5 w-7 rounded-full bg-gradient-to-r ${item.style}`} />
            <p className="text-[11px] font-medium leading-tight text-slate-500">{item.status}</p>
            <p className="mt-1 text-xl font-bold tracking-tight text-[#0b203a] tabular-nums">
              {item.count}
            </p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-pink-50 pt-4">
        <span className="text-xs font-medium text-slate-500">Total enquiries this month</span>
        <span className="text-sm font-bold text-[#0b203a] tabular-nums">{total}</span>
      </div>
    </div>
  );
}
