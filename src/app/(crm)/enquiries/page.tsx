import { Columns3Icon, PlusIcon, UsersRoundIcon } from "lucide-react";
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
    <div className="enquiries-system mx-auto flex w-full max-w-[1600px] flex-col gap-5">
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
        <div className="pointer-events-none absolute -right-12 -top-24 size-56 rounded-full bg-pink-100/70 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-600 ring-1 ring-pink-100">
              <UsersRoundIcon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-[-0.035em] text-[#0b203a]">Enquiries</h1>
                <span className="rounded-full bg-pink-50 px-2.5 py-1 text-xs font-bold text-pink-700 ring-1 ring-pink-100">
                  {result.total}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {user.role === "executive"
                  ? "Review and progress the enquiries assigned to you."
                  : "Capture, qualify, and progress every incoming opportunity."}
              </p>
            </div>
          </div>
          <div className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/enquiries/kanban" />}
              className="h-9 border-pink-100 bg-white px-3 text-pink-700 shadow-sm hover:bg-pink-50"
            >
              <Columns3Icon aria-hidden="true" />
              Kanban view
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/enquiries/new" />}
              className="h-9 bg-pink-600 px-3 text-white shadow-sm shadow-pink-200 hover:bg-pink-700"
            >
              <PlusIcon aria-hidden="true" />
              New enquiry
            </Button>
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-pink-100/80 bg-white p-4 shadow-[0_12px_30px_-26px_rgba(107,28,64,0.45)]">
        <EnquiryFiltersForm search={q} status={status} source={source} />
      </div>

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
