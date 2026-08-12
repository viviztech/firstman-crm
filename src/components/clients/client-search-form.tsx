import { Input } from "@/components/ui/input";

export function ClientSearchForm({ defaultValue }: { defaultValue?: string }) {
  return (
    <form method="get" className="max-w-sm">
      <Input
        type="search"
        name="q"
        placeholder="Search by name, phone, or customer ID…"
        defaultValue={defaultValue}
      />
    </form>
  );
}
