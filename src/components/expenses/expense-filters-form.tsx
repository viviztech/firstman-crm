import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ExpenseFiltersForm({ search }: { search?: string }) {
  return (
    <form
      method="get"
      className="flex flex-col gap-3 rounded-2xl border border-pink-100 bg-white p-4 shadow-[0_14px_35px_-30px_rgba(107,28,64,0.5)] sm:flex-row sm:items-center"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
        <SlidersHorizontalIcon className="size-4" aria-hidden="true" />
      </div>
      <div className="relative min-w-0 flex-1 sm:max-w-md">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          name="q"
          placeholder="Search category or description…"
          defaultValue={search}
          className="pl-9"
        />
      </div>
      <Button type="submit">Apply filters</Button>
      {search ? (
        <Button variant="ghost" nativeButton={false} render={<Link href="/expenses" />}>
          <XIcon className="size-4" aria-hidden="true" /> Clear
        </Button>
      ) : null}
    </form>
  );
}
