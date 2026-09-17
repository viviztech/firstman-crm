import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { orderStatusEnum } from "@/db/schema/orders";
import { ORDER_STATUS_BADGE } from "@/lib/badges";

const SELECT_CLASSNAME =
  "h-8 rounded-lg border border-pink-100 bg-slate-50/60 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function OrderFiltersForm({ search, status }: { search?: string; status?: string }) {
  return (
    <form
      method="get"
      className="flex flex-col gap-3 rounded-xl border border-pink-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-[#0b203a] sm:mr-1">
        <SlidersHorizontalIcon className="size-4 text-pink-600" aria-hidden="true" />
        Filter queue
      </div>
      <div className="relative min-w-0 flex-1">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <Input
          type="search"
          name="q"
          placeholder="Search by job card number…"
          defaultValue={search}
          className="w-full pl-9"
        />
      </div>
      <select
        name="status"
        defaultValue={status ?? ""}
        className={`${SELECT_CLASSNAME} w-full sm:w-48`}
      >
        <option value="">All statuses</option>
        {orderStatusEnum.enumValues.map((value) => (
          <option key={value} value={value}>
            {ORDER_STATUS_BADGE[value].label}
          </option>
        ))}
      </select>
      <Button type="submit">Apply</Button>
      {search || status ? (
        <Button
          variant="ghost"
          className="text-slate-500 hover:bg-pink-50 hover:text-pink-700"
          nativeButton={false}
          render={<Link href="/orders" />}
        >
          <XIcon className="size-4" aria-hidden="true" />
          Clear
        </Button>
      ) : null}
    </form>
  );
}
