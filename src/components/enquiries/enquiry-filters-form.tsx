import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { enquirySourceEnum, enquiryStatusEnum } from "@/db/schema/enquiries";
import { ENQUIRY_SOURCE_LABEL, ENQUIRY_STATUS_BADGE } from "@/lib/badges";

const SELECT_CLASSNAME =
  "h-9 min-w-36 rounded-xl border border-pink-100 bg-white px-3 text-sm text-slate-700 outline-none transition-colors hover:border-pink-200 focus-visible:border-pink-500 focus-visible:ring-3 focus-visible:ring-pink-500/15";

export function EnquiryFiltersForm({
  search,
  status,
  source,
}: {
  search?: string;
  status?: string;
  source?: string;
}) {
  return (
    <form method="get" className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="hidden size-9 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-600 sm:flex">
          <SlidersHorizontalIcon className="size-4" aria-hidden="true" />
        </span>
        <div className="relative min-w-0 flex-1 lg:max-w-sm">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <Input
            type="search"
            name="q"
            aria-label="Search enquiries"
            placeholder="Search by name or phone…"
            defaultValue={search}
            className="h-9 rounded-xl border-pink-100 bg-slate-50/60 pr-3 pl-9 focus-visible:border-pink-500 focus-visible:ring-pink-500/15"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="enquiry-status-filter">
          Filter by status
        </label>
        <select
          id="enquiry-status-filter"
          name="status"
          defaultValue={status ?? ""}
          className={SELECT_CLASSNAME}
        >
          <option value="">All statuses</option>
          {enquiryStatusEnum.enumValues.map((value) => (
            <option key={value} value={value}>
              {ENQUIRY_STATUS_BADGE[value].label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="enquiry-source-filter">
          Filter by source
        </label>
        <select
          id="enquiry-source-filter"
          name="source"
          defaultValue={source ?? ""}
          className={SELECT_CLASSNAME}
        >
          <option value="">All sources</option>
          {enquirySourceEnum.enumValues.map((value) => (
            <option key={value} value={value}>
              {ENQUIRY_SOURCE_LABEL[value]}
            </option>
          ))}
        </select>

        <Button type="submit" className="h-9 bg-pink-600 px-4 text-white hover:bg-pink-700">
          Apply filters
        </Button>
        {search || status || source ? (
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/enquiries" />}
            className="h-9 text-slate-500 hover:bg-slate-100"
          >
            <XIcon aria-hidden="true" />
            Clear
          </Button>
        ) : null}
      </div>
    </form>
  );
}
