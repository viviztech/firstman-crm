import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { enquirySourceEnum, enquiryStatusEnum } from "@/db/schema/enquiries";
import { ENQUIRY_SOURCE_LABEL, ENQUIRY_STATUS_BADGE } from "@/lib/badges";

const SELECT_CLASSNAME =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

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
    <form method="get" className="flex flex-wrap items-end gap-2">
      <Input
        type="search"
        name="q"
        placeholder="Search by name or phone…"
        defaultValue={search}
        className="max-w-xs"
      />
      <select name="status" defaultValue={status ?? ""} className={SELECT_CLASSNAME}>
        <option value="">All statuses</option>
        {enquiryStatusEnum.enumValues.map((value) => (
          <option key={value} value={value}>
            {ENQUIRY_STATUS_BADGE[value].label}
          </option>
        ))}
      </select>
      <select name="source" defaultValue={source ?? ""} className={SELECT_CLASSNAME}>
        <option value="">All sources</option>
        {enquirySourceEnum.enumValues.map((value) => (
          <option key={value} value={value}>
            {ENQUIRY_SOURCE_LABEL[value]}
          </option>
        ))}
      </select>
      <Button type="submit" variant="outline">
        Filter
      </Button>
    </form>
  );
}
