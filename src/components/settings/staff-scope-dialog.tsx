"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateStaffServiceAssignmentsAction } from "@/actions/staff";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { EmployeeType, StaffTeam } from "@/lib/scope";
import { hasStaffTeam } from "@/lib/teams";

type ServiceOption = { id: string; name: string };

export function StaffScopeDialog({
  userId,
  userName,
  employeeType,
  team,
  pincodes,
  serviceIds,
  services,
}: {
  userId: string;
  userName: string;
  employeeType: EmployeeType;
  team: StaffTeam | null;
  pincodes: string[];
  serviceIds: string[];
  services: ServiceOption[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(serviceIds);
  const [isPending, startTransition] = useTransition();
  const handlesOperations = hasStaffTeam(team, "operations");

  function toggleService(serviceId: string, checked: boolean) {
    setSelectedServiceIds((current) =>
      checked ? [...current, serviceId] : current.filter((id) => id !== serviceId),
    );
  }

  function handleSave() {
    startTransition(async () => {
      const serviceResult = await updateStaffServiceAssignmentsAction(userId, selectedServiceIds);
      if (!serviceResult.ok) {
        toast.error(serviceResult.error);
        return;
      }

      toast.success(`Scope updated for ${userName}`);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Edit scope</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scope for {userName}</DialogTitle>
          <DialogDescription>
            {handlesOperations
              ? "Select the services this employee can handle. At least one service is required to receive or pick up job cards."
              : employeeType === "franchise"
                ? "Territories are managed centrally. Choose which services this franchise handles here."
                : "Services this employee handles. Leave empty for no restriction."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {employeeType === "franchise" ? (
            <div className="rounded-md border p-3 text-sm">
              <p className="text-muted-foreground">
                Legacy pincodes: {pincodes.length > 0 ? pincodes.join(", ") : "none"}
              </p>
              <Button
                className="mt-2"
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href="/settings/franchises" />}
              >
                Manage franchise territory
              </Button>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label>Services</Label>
            <div className="flex max-h-48 flex-col gap-2 overflow-y-auto rounded-md border p-2">
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground">No services in the catalog yet.</p>
              ) : (
                services.map((service) => (
                  <div key={service.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      id={`service-${service.id}`}
                      checked={selectedServiceIds.includes(service.id)}
                      onCheckedChange={(checked) => toggleService(service.id, checked === true)}
                    />
                    <Label htmlFor={`service-${service.id}`} className="font-normal">
                      {service.name}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
