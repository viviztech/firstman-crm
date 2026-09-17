import { ListIcon, PlusIcon, WorkflowIcon } from "lucide-react";
import Link from "next/link";
import { toScope } from "@/actions/shared";
import { KanbanBoard } from "@/components/enquiries/kanban-board";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/session";
import { listServicesForOrders } from "@/services/catalog";
import { listEnquiriesForBoard } from "@/services/enquiries";
import { listStates } from "@/services/geography";
import { listApprovedQuoteSummariesByEnquiryId } from "@/services/quotes";

export default async function EnquiriesKanbanPage() {
  const user = await requireRole("super_admin", "manager", "executive");
  const [enquiries, services, states] = await Promise.all([
    listEnquiriesForBoard(await toScope(user)),
    listServicesForOrders(),
    listStates(),
  ]);
  const approvedQuotesByEnquiryId = await listApprovedQuoteSummariesByEnquiryId(
    enquiries.map((enquiry) => enquiry.id),
  );

  return (
    <div className="enquiry-workflow mx-auto flex w-full min-w-0 max-w-[1800px] flex-col gap-5 overflow-x-hidden">
      <section className="relative overflow-hidden rounded-2xl border border-pink-100 bg-white px-5 py-6 shadow-[0_18px_45px_-32px_rgba(107,28,64,0.35)] sm:px-7">
        <div className="pointer-events-none absolute -right-12 -top-24 size-56 rounded-full bg-pink-100/70 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-600 to-pink-400 text-white shadow-sm shadow-pink-200">
              <WorkflowIcon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-[-0.035em] text-[#0b203a]">
                Enquiry pipeline
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Drag a card between stages. Moving it to Won starts the sales conversion flow.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/enquiries" />}
              className="h-9 border-pink-100 text-pink-700 hover:bg-pink-50"
            >
              <ListIcon aria-hidden="true" />
              Table view
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/enquiries/new" />}
              className="h-9 bg-pink-600 text-white hover:bg-pink-700"
            >
              <PlusIcon aria-hidden="true" />
              New enquiry
            </Button>
          </div>
        </div>
      </section>

      <KanbanBoard
        enquiries={enquiries}
        services={services}
        states={states}
        approvedQuotesByEnquiryId={Object.fromEntries(approvedQuotesByEnquiryId)}
      />
    </div>
  );
}
