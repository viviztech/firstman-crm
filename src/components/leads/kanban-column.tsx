"use client";

import { useDroppable } from "@dnd-kit/core";
import { KanbanCard } from "@/components/leads/kanban-card";
import type { BoardLead } from "@/components/leads/kanban-types";
import { LEAD_STATUS_BADGE, type LeadStatus } from "@/lib/badges";
import { cn } from "@/lib/utils";

export function KanbanColumn({ status, leads }: { status: LeadStatus; leads: BoardLead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const { label } = LEAD_STATUS_BADGE[status];

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{leads.length}</span>
      </div>
      <div
        ref={setNodeRef}
        data-testid={`kanban-column-${status}`}
        className={cn(
          "flex min-h-24 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors",
          isOver && "border-primary bg-primary/5",
        )}
      >
        {leads.map((lead) => (
          <KanbanCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
}
