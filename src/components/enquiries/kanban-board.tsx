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
import { useState } from "react";
import { toast } from "sonner";
import { updateEnquiryStatusAction } from "@/actions/enquiries";
import { KanbanColumn } from "@/components/enquiries/kanban-column";
import type { BoardEnquiry } from "@/components/enquiries/kanban-types";
import { LostDialog } from "@/components/enquiries/lost-dialog";
import { SalesDialog } from "@/components/enquiries/sales-dialog";
import { ENQUIRY_STATUS_ORDER, type EnquiryStatus } from "@/lib/badges";

export type { BoardEnquiry } from "@/components/enquiries/kanban-types";

type ServiceOption = {
  id: string;
  name: string;
  basePricePaise: number;
  govtFeePaise: number | null;
};
type StateOption = { id: string; name: string };

export function KanbanBoard({
  enquiries: initialEnquiries,
  services,
  states,
}: {
  enquiries: BoardEnquiry[];
  services: ServiceOption[];
  states: StateOption[];
}) {
  const [enquiries, setEnquiries] = useState(initialEnquiries);
  const [salesTarget, setSalesTarget] = useState<{
    id: string;
    previousStatus: EnquiryStatus;
  } | null>(null);
  const [lostTarget, setLostTarget] = useState<{
    id: string;
    previousStatus: EnquiryStatus;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  function moveLocal(id: string, status: EnquiryStatus) {
    setEnquiries((prev) =>
      prev.map((enquiry) => (enquiry.id === id ? { ...enquiry, status } : enquiry)),
    );
  }

  function removeLocal(id: string) {
    setEnquiries((prev) => prev.filter((enquiry) => enquiry.id !== id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const enquiryId = String(active.id);
    const targetStatus = over.id as EnquiryStatus;
    const enquiry = enquiries.find((candidate) => candidate.id === enquiryId);
    if (!enquiry || enquiry.status === targetStatus) return;

    const previousStatus = enquiry.status;
    moveLocal(enquiryId, targetStatus);

    if (targetStatus === "won") {
      setSalesTarget({ id: enquiryId, previousStatus });
      return;
    }

    if (targetStatus === "lost") {
      setLostTarget({ id: enquiryId, previousStatus });
      return;
    }

    updateEnquiryStatusAction(enquiryId, targetStatus).then((result) => {
      if (!result.ok) {
        moveLocal(enquiryId, previousStatus);
        toast.error(result.error);
      }
    });
  }

  const salesEnquiry = salesTarget ? enquiries.find((e) => e.id === salesTarget.id) : undefined;

  return (
    <>
      <DndContext
        id="enquiries-kanban"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {ENQUIRY_STATUS_ORDER.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              enquiries={enquiries.filter((enquiry) => enquiry.status === status)}
            />
          ))}
        </div>
      </DndContext>

      {salesEnquiry ? (
        <SalesDialog
          enquiryId={salesEnquiry.id}
          open={salesTarget !== null}
          onOpenChange={(open) => {
            if (!open && salesTarget) {
              moveLocal(salesTarget.id, salesTarget.previousStatus);
              setSalesTarget(null);
            }
          }}
          source={salesEnquiry.source}
          defaults={{
            name: salesEnquiry.name,
            phone: salesEnquiry.phone,
            email: salesEnquiry.email,
            address: salesEnquiry.address,
            city: salesEnquiry.city,
            pincode: salesEnquiry.pincode,
            serviceInterestedId: salesEnquiry.serviceInterestedId,
          }}
          services={services}
          states={states}
        />
      ) : null}

      <LostDialog
        open={lostTarget !== null}
        onOpenChange={(open) => {
          if (!open && lostTarget) {
            moveLocal(lostTarget.id, lostTarget.previousStatus);
            setLostTarget(null);
          }
        }}
        onConfirm={(reason) => {
          if (!lostTarget) return;
          const { id, previousStatus } = lostTarget;
          setLostTarget(null);
          updateEnquiryStatusAction(id, "lost", reason).then((result) => {
            if (!result.ok) {
              moveLocal(id, previousStatus);
              toast.error(result.error);
              return;
            }
            removeLocal(id);
          });
        }}
      />
    </>
  );
}
