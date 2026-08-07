import Link from "next/link";
import { toScope } from "@/actions/shared";
import { ComplianceFiltersForm } from "@/components/compliance/compliance-filters-form";
import { ComplianceTable } from "@/components/compliance/compliance-table";
import { ListPagination } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/session";
import { listComplianceItems } from "@/services/compliance";

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const user = await requireRole("super_admin", "manager", "executive");
  const { page, q, status } = await searchParams;

  const result = await listComplianceItems(await toScope(user), {
    page: page ? Number(page) : 1,
    search: q,
    status,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Compliance</h1>
          <p className="text-sm text-muted-foreground">
            {user.role === "executive"
              ? "Deadlines for clients assigned to you."
              : "All client compliance deadlines."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/compliance/calendar" />}
          >
            Calendar
          </Button>
          <Button nativeButton={false} render={<Link href="/compliance/new" />}>
            New item
          </Button>
        </div>
      </div>

      <ComplianceFiltersForm search={q} status={status} />

      <ComplianceTable items={result.rows} />

      <ListPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        basePath="/compliance"
        searchParams={{ q, status }}
      />
    </div>
  );
}
