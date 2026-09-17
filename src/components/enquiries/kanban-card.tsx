"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Clock3Icon, GripVerticalIcon, UserRoundIcon } from "lucide-react";
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
        "group flex cursor-grab flex-col gap-2.5 rounded-xl border border-pink-100 bg-white p-3.5 text-sm shadow-[0_8px_22px_-18px_rgba(107,28,64,0.5)] outline-none transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-[0_12px_28px_-18px_rgba(107,28,64,0.4)] active:cursor-grabbing focus-visible:ring-3 focus-visible:ring-pink-500/30",
        isDragging && "rotate-1 opacity-60 shadow-lg",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/enquiries/${enquiry.id}`}
          onPointerDown={(event) => event.stopPropagation()}
          className="font-semibold text-[#0b203a] hover:text-pink-700"
        >
          {enquiry.name}
        </Link>
        <div className="flex items-center gap-1.5">
          {isOverdue(enquiry.nextFollowUpAt) ? (
            <Badge variant="destructive" className="rounded-full text-[10px]">
              Overdue
            </Badge>
          ) : null}
          <GripVerticalIcon
            className="size-4 text-slate-300 transition-colors group-hover:text-pink-400"
            aria-hidden="true"
          />
        </div>
      </div>
      <span className="text-xs font-medium text-slate-500">{enquiry.phone}</span>
      <div className="flex items-center justify-between gap-2 border-t border-pink-50 pt-2.5 text-xs text-slate-500">
        <span className="flex min-w-0 items-center gap-1.5">
          <UserRoundIcon className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{enquiry.assignee?.name ?? "Unassigned"}</span>
        </span>
        {enquiry.nextFollowUpAt ? (
          <Clock3Icon
            className="size-3.5 shrink-0 text-pink-400"
            aria-label="Follow-up scheduled"
          />
        ) : null}
      </div>
    </div>
  );
}
