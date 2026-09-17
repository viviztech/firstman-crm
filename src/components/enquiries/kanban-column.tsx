"use client";

import { useDroppable } from "@dnd-kit/core";
import { KanbanCard } from "@/components/enquiries/kanban-card";
import type { BoardEnquiry } from "@/components/enquiries/kanban-types";
import { ENQUIRY_STATUS_BADGE, type EnquiryStatus } from "@/lib/badges";
import { cn } from "@/lib/utils";

const STATUS_ACCENT: Record<EnquiryStatus, string> = {
  new: "bg-pink-600",
  contacted: "bg-pink-400",
  qualified: "bg-teal-500",
  proposal_sent: "bg-amber-400",
  negotiation: "bg-violet-500",
  won: "bg-emerald-500",
  lost: "bg-slate-400",
};

export function KanbanColumn({
  status,
  enquiries,
}: {
  status: EnquiryStatus;
  enquiries: BoardEnquiry[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const { label } = ENQUIRY_STATUS_BADGE[status];

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2.5">
      <div className="flex items-center justify-between px-1">
        <span className="flex items-center gap-2 text-sm font-bold text-[#0b203a]">
          <span className={cn("size-2 rounded-full", STATUS_ACCENT[status])} aria-hidden="true" />
          {label}
        </span>
        <span className="min-w-6 rounded-full bg-slate-100 px-2 py-0.5 text-center text-[11px] font-bold text-slate-500">
          {enquiries.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        data-testid={`kanban-column-${status}`}
        className={cn(
          "flex min-h-32 flex-col gap-2.5 rounded-xl border border-dashed border-pink-100 bg-slate-50/60 p-2.5 transition-colors",
          isOver && "border-pink-400 bg-pink-50 ring-2 ring-pink-100",
        )}
      >
        {enquiries.map((enquiry) => (
          <KanbanCard key={enquiry.id} enquiry={enquiry} />
        ))}
      </div>
    </div>
  );
}
