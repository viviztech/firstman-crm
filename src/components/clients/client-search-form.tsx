import { SearchIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ClientSearchForm({ defaultValue }: { defaultValue?: string }) {
  return (
    <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1 sm:max-w-md">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <Input
          type="search"
          name="q"
          aria-label="Search clients"
          placeholder="Search by name, phone, or customer ID…"
          defaultValue={defaultValue}
          className="h-9 rounded-xl border-pink-100 bg-slate-50/60 pr-3 pl-9 focus-visible:border-pink-500 focus-visible:ring-pink-500/15"
        />
      </div>
      <Button type="submit" className="h-9 bg-pink-600 px-4 text-white hover:bg-pink-700">
        Search clients
      </Button>
      {defaultValue ? (
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link href="/clients" />}
          className="h-9 text-slate-500 hover:bg-slate-100"
        >
          <XIcon aria-hidden="true" />
          Clear
        </Button>
      ) : null}
    </form>
  );
}
