import Link from "next/link";
import { ListPagination } from "@/components/list-pagination";
import { OrderFiltersForm } from "@/components/orders/order-filters-form";
import { OrdersTable } from "@/components/orders/orders-table";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/session";
import { listOrders } from "@/services/orders";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const user = await requireUser();
  const { page, q, status } = await searchParams;

  const result = await listOrders(
    { userId: user.id, role: user.role },
    { page: page ? Number(page) : 1, search: q, status },
  );

  const canCreate = user.role !== "accountant";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-sm text-muted-foreground">
            {user.role === "executive" ? "Orders assigned to you." : "All orders."}
          </p>
        </div>
        {canCreate ? (
          <Button nativeButton={false} render={<Link href="/orders/new" />}>
            New order
          </Button>
        ) : null}
      </div>

      <OrderFiltersForm search={q} status={status} />

      <OrdersTable orders={result.rows} />

      <ListPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        basePath="/orders"
        searchParams={{ q, status }}
      />
    </div>
  );
}
