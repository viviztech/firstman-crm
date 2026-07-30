import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ExpenseFiltersForm({ search }: { search?: string }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-2">
      <Input
        type="search"
        name="q"
        placeholder="Search by category or description…"
        defaultValue={search}
        className="max-w-xs"
      />
      <Button type="submit" variant="outline">
        Filter
      </Button>
    </form>
  );
}
