import Link from "next/link";
import { InvoiceFiltersForm } from "@/components/invoices/invoice-filters-form";
import { InvoicesTable } from "@/components/invoices/invoices-table";
import { ListPagination } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/session";
import { listInvoices } from "@/services/invoices";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const user = await requireRole("super_admin", "manager", "accountant");
  const { page, q, status } = await searchParams;

  const result = await listInvoices(
    { userId: user.id, role: user.role },
    { page: page ? Number(page) : 1, search: q, status },
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-sm text-muted-foreground">All client invoices.</p>
        </div>
        <Button nativeButton={false} render={<Link href="/invoices/new" />}>
          New invoice
        </Button>
      </div>

      <InvoiceFiltersForm search={q} status={status} />

      <InvoicesTable invoices={result.rows} />

      <ListPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        basePath="/invoices"
        searchParams={{ q, status }}
      />
    </div>
  );
}
