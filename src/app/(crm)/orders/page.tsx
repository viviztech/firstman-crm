import { ClipboardListIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { toScope } from "@/actions/shared";
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

  const result = await listOrders(await toScope(user), {
    page: page ? Number(page) : 1,
    search: q,
    status,
  });

  const canCreate = user.role !== "accountant";

  return (
    <div className="order-workflow flex flex-col gap-5">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#9c2054] via-[#ba2a66] to-[#d94b86] px-5 py-6 text-white shadow-[0_22px_55px_-30px_rgba(107,28,64,0.65)] sm:px-7 sm:py-7">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-30"
          aria-hidden="true"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1.5px, transparent 0)",
            backgroundSize: "24px 24px",
            maskImage: "linear-gradient(to left, black, transparent)",
          }}
        />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
              <ClipboardListIcon className="size-5" aria-hidden="true" />
            </div>
            <p className="text-xs font-semibold tracking-[0.18em] text-pink-100 uppercase">
              Operations queue
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Job Cards</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-pink-50/90">
              {user.role === "executive"
                ? "Track the client work assigned to you and keep every delivery moving."
                : "Track ownership, documents, deadlines, and delivery across active client work."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/12 px-4 py-2 text-right ring-1 ring-white/20">
              <p className="text-2xl font-bold leading-none">{result.total}</p>
              <p className="mt-1 text-[11px] text-pink-100">matching job cards</p>
            </div>
            {canCreate ? (
              <Button
                className="bg-white text-pink-700 shadow-sm hover:bg-pink-50 hover:text-pink-800"
                nativeButton={false}
                render={<Link href="/orders/new" />}
              >
                <PlusIcon className="size-4" aria-hidden="true" />
                New job card
              </Button>
            ) : null}
          </div>
        </div>
      </section>

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
