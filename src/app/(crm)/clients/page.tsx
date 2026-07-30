import Link from "next/link";
import { ClientSearchForm } from "@/components/clients/client-search-form";
import { ClientsTable } from "@/components/clients/clients-table";
import { ListPagination } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/session";
import { listClients } from "@/services/clients";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const user = await requireUser();
  const { page, q } = await searchParams;

  const result = await listClients(
    { userId: user.id, role: user.role },
    { page: page ? Number(page) : 1, search: q },
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {user.role === "executive" ? "Clients assigned to you." : "All clients."}
          </p>
        </div>
        {user.role !== "accountant" ? (
          <Button nativeButton={false} render={<Link href="/clients/new" />}>
            New client
          </Button>
        ) : null}
      </div>

      <ClientSearchForm defaultValue={q} />

      <ClientsTable clients={result.rows} />

      <ListPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        basePath="/clients"
        searchParams={{ q }}
      />
    </div>
  );
}
