import Link from "next/link";
import { toScope } from "@/actions/shared";
import { EnquiriesTable } from "@/components/enquiries/enquiries-table";
import { EnquiryFiltersForm } from "@/components/enquiries/enquiry-filters-form";
import { ListPagination } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/session";
import { listEnquiries } from "@/services/enquiries";

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string; source?: string }>;
}) {
  const user = await requireRole("super_admin", "manager", "executive");
  const { page, q, status, source } = await searchParams;

  const result = await listEnquiries(await toScope(user), {
    page: page ? Number(page) : 1,
    search: q,
    status,
    source,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Enquiries</h1>
          <p className="text-sm text-muted-foreground">
            {user.role === "executive" ? "Enquiries assigned to you." : "All enquiries."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/enquiries/kanban" />}>
            Kanban
          </Button>
          <Button nativeButton={false} render={<Link href="/enquiries/new" />}>
            New enquiry
          </Button>
        </div>
      </div>

      <EnquiryFiltersForm search={q} status={status} source={source} />

      <EnquiriesTable enquiries={result.rows} />

      <ListPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        basePath="/enquiries"
        searchParams={{ q, status, source }}
      />
    </div>
  );
}
