import { PlusIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { toScope } from "@/actions/shared";
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

  const result = await listClients(await toScope(user), {
    page: page ? Number(page) : 1,
    search: q,
  });

  return (
    <div className="client-workflow mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <section className="relative overflow-hidden rounded-2xl border border-pink-100 bg-white px-5 py-6 shadow-[0_18px_45px_-32px_rgba(107,28,64,0.35)] sm:px-7">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-2/5 sm:block"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgb(186 42 102 / 0.14) 1.5px, transparent 0)",
            backgroundSize: "24px 24px",
            maskImage: "linear-gradient(to left, black 5%, transparent 95%)",
          }}
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-600 ring-1 ring-pink-100">
              <UsersIcon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-[-0.035em] text-[#0b203a]">Clients</h1>
                <span className="rounded-full bg-pink-50 px-2.5 py-1 text-xs font-bold text-pink-700 ring-1 ring-pink-100">
                  {result.total}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {user.role === "executive"
                  ? "Access the client accounts assigned to you."
                  : "Manage active customer accounts and their service relationships."}
              </p>
            </div>
          </div>
          {user.role !== "accountant" ? (
            <Button
              nativeButton={false}
              render={<Link href="/clients/new" />}
              className="h-9 bg-pink-600 px-3 text-white shadow-sm shadow-pink-200 hover:bg-pink-700"
            >
              <PlusIcon aria-hidden="true" />
              New client
            </Button>
          ) : null}
        </div>
      </section>

      <div className="rounded-2xl border border-pink-100/80 bg-white p-4 shadow-[0_12px_30px_-26px_rgba(107,28,64,0.45)]">
        <ClientSearchForm defaultValue={q} />
      </div>

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
