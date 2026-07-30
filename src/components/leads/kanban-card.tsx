"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import type { BoardLead } from "@/components/leads/kanban-types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function isOverdue(nextFollowUpAt: Date | string | null): boolean {
  if (!nextFollowUpAt) return false;
  return new Date(nextFollowUpAt).getTime() < Date.now();
}

export function KanbanCard({ lead }: { lead: BoardLead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-card-${lead.id}`}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      className={cn(
        "flex cursor-grab flex-col gap-1 rounded-lg border bg-card p-3 text-sm shadow-sm outline-none active:cursor-grabbing focus-visible:ring-3 focus-visible:ring-ring/50",
        isDragging && "opacity-50",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/leads/${lead.id}`}
          onPointerDown={(event) => event.stopPropagation()}
          className="font-medium hover:underline"
        >
          {lead.name}
        </Link>
        {isOverdue(lead.nextFollowUpAt) ? <Badge variant="destructive">Overdue</Badge> : null}
      </div>
      <span className="text-muted-foreground">{lead.phone}</span>
      <span className="text-xs text-muted-foreground">{lead.assignee?.name ?? "Unassigned"}</span>
    </div>
  );
}
