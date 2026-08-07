"use client";

import { useDroppable } from "@dnd-kit/core";
import { KanbanCard } from "@/components/enquiries/kanban-card";
import type { BoardEnquiry } from "@/components/enquiries/kanban-types";
import { ENQUIRY_STATUS_BADGE, type EnquiryStatus } from "@/lib/badges";
import { cn } from "@/lib/utils";

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
    <div className="flex w-72 shrink-0 flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{enquiries.length}</span>
      </div>
      <div
        ref={setNodeRef}
        data-testid={`kanban-column-${status}`}
        className={cn(
          "flex min-h-24 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors",
          isOver && "border-primary bg-primary/5",
        )}
      >
        {enquiries.map((enquiry) => (
          <KanbanCard key={enquiry.id} enquiry={enquiry} />
        ))}
      </div>
    </div>
  );
}
