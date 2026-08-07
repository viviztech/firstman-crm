"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import type { BoardEnquiry } from "@/components/enquiries/kanban-types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function isOverdue(nextFollowUpAt: Date | string | null): boolean {
  if (!nextFollowUpAt) return false;
  return new Date(nextFollowUpAt).getTime() < Date.now();
}

export function KanbanCard({ enquiry }: { enquiry: BoardEnquiry }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: enquiry.id,
  });

  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-card-${enquiry.id}`}
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
          href={`/enquiries/${enquiry.id}`}
          onPointerDown={(event) => event.stopPropagation()}
          className="font-medium hover:underline"
        >
          {enquiry.name}
        </Link>
        {isOverdue(enquiry.nextFollowUpAt) ? <Badge variant="destructive">Overdue</Badge> : null}
      </div>
      <span className="text-muted-foreground">{enquiry.phone}</span>
      <span className="text-xs text-muted-foreground">
        {enquiry.assignee?.name ?? "Unassigned"}
      </span>
    </div>
  );
}
