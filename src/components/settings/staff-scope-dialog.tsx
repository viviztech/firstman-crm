"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateStaffPincodesAction, updateStaffServiceAssignmentsAction } from "@/actions/staff";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import type { EmployeeType } from "@/lib/scope";

type ServiceOption = { id: string; name: string };

export function StaffScopeDialog({
  userId,
  userName,
  employeeType,
  pincodes,
  serviceIds,
  services,
}: {
  userId: string;
  userName: string;
  employeeType: EmployeeType;
  pincodes: string[];
  serviceIds: string[];
  services: ServiceOption[];
}) {
  const [open, setOpen] = useState(false);
  const [pincodeText, setPincodeText] = useState(pincodes.join(", "));
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(serviceIds);
  const [isPending, startTransition] = useTransition();

  function toggleService(serviceId: string, checked: boolean) {
    setSelectedServiceIds((current) =>
      checked ? [...current, serviceId] : current.filter((id) => id !== serviceId),
    );
  }

  function handleSave() {
    startTransition(async () => {
      if (employeeType === "franchise") {
        const parsedPincodes = Array.from(
          new Set(
            pincodeText
              .split(/[,\n]/)
              .map((value) => value.trim())
              .filter(Boolean),
          ),
        );
        const pincodeResult = await updateStaffPincodesAction(userId, parsedPincodes);
        if (!pincodeResult.ok) {
          toast.error(pincodeResult.error);
          return;
        }
      }

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
            {employeeType === "franchise"
              ? "Pincodes this franchise covers, and which services they handle. Leave services empty for no restriction."
              : "Services this employee handles. Leave empty for no restriction."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {employeeType === "franchise" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="staff-pincodes">Pincodes</Label>
              <Textarea
                id="staff-pincodes"
                value={pincodeText}
                onChange={(event) => setPincodeText(event.target.value)}
                placeholder="560001, 560002"
                rows={3}
              />
              <div className="flex flex-wrap gap-1">
                {pincodeText
                  .split(/[,\n]/)
                  .map((value) => value.trim())
                  .filter(Boolean)
                  .map((pincode) => (
                    <Badge key={pincode} variant="secondary">
                      {pincode}
                    </Badge>
                  ))}
              </div>
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
