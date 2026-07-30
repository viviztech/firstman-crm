import Link from "next/link";
import { LeadFiltersForm } from "@/components/leads/lead-filters-form";
import { LeadsTable } from "@/components/leads/leads-table";
import { ListPagination } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/session";
import { listLeads } from "@/services/leads";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string; source?: string }>;
}) {
  const user = await requireRole("super_admin", "manager", "executive");
  const { page, q, status, source } = await searchParams;

  const result = await listLeads(
    { userId: user.id, role: user.role },
    { page: page ? Number(page) : 1, search: q, status, source },
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-muted-foreground">
            {user.role === "executive" ? "Leads assigned to you." : "All leads."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/leads/kanban" />}>
            Kanban
          </Button>
          <Button nativeButton={false} render={<Link href="/leads/new" />}>
            New lead
          </Button>
        </div>
      </div>

      <LeadFiltersForm search={q} status={status} source={source} />

      <LeadsTable leads={result.rows} />

      <ListPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        basePath="/leads"
        searchParams={{ q, status, source }}
      />
    </div>
  );
}
