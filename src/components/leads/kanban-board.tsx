"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { convertLeadAction, updateLeadStatusAction } from "@/actions/leads";
import { KanbanColumn } from "@/components/leads/kanban-column";
import type { BoardLead } from "@/components/leads/kanban-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_STATUS_ORDER, type LeadStatus } from "@/lib/badges";

export type { BoardLead } from "@/components/leads/kanban-types";

export function KanbanBoard({ leads: initialLeads }: { leads: BoardLead[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [, startTransition] = useTransition();
  const [lostDialog, setLostDialog] = useState<{ id: string; previousStatus: LeadStatus } | null>(
    null,
  );
  const [lostReason, setLostReason] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  function moveLocal(id: string, status: LeadStatus) {
    setLeads((prev) => prev.map((lead) => (lead.id === id ? { ...lead, status } : lead)));
  }

  function cancelLostDialog() {
    if (lostDialog) moveLocal(lostDialog.id, lostDialog.previousStatus);
    setLostDialog(null);
    setLostReason("");
  }

  function confirmLostReason() {
    if (!lostDialog || !lostReason.trim()) return;
    const { id, previousStatus } = lostDialog;
    const reason = lostReason.trim();
    setLostDialog(null);
    setLostReason("");

    startTransition(async () => {
      const result = await updateLeadStatusAction(id, "lost", reason);
      if (!result.ok) {
        moveLocal(id, previousStatus);
        toast.error(result.error);
      }
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const leadId = String(active.id);
    const targetStatus = over.id as LeadStatus;
    const lead = leads.find((candidate) => candidate.id === leadId);
    if (!lead || lead.status === targetStatus) return;

    const previousStatus = lead.status;
    moveLocal(leadId, targetStatus);

    if (targetStatus === "lost") {
      setLostDialog({ id: leadId, previousStatus });
      return;
    }

    startTransition(async () => {
      if (targetStatus === "won") {
        const result = await convertLeadAction(leadId);
        if (!result.ok) {
          moveLocal(leadId, previousStatus);
          toast.error(result.error);
          return;
        }
        toast.success("Lead converted to client");
        router.push(`/clients/${result.data.clientId}`);
        return;
      }

      const result = await updateLeadStatusAction(leadId, targetStatus);
      if (!result.ok) {
        moveLocal(leadId, previousStatus);
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <DndContext
        id="leads-kanban"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {LEAD_STATUS_ORDER.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              leads={leads.filter((lead) => lead.status === status)}
            />
          ))}
        </div>
      </DndContext>

      <Dialog
        open={lostDialog !== null}
        onOpenChange={(open) => {
          if (!open) cancelLostDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Why was this lead lost?</DialogTitle>
            <DialogDescription>This reason is saved with the lead.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={lostReason}
            onChange={(event) => setLostReason(event.target.value)}
            placeholder="e.g. Went with a competitor"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={cancelLostDialog}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmLostReason} disabled={!lostReason.trim()}>
              Mark as lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
