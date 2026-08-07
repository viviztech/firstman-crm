"use client";

import { useState } from "react";
import { SalesDialog } from "@/components/enquiries/sales-dialog";
import { Button } from "@/components/ui/button";
import type { EnquirySource } from "@/lib/badges";

type ServiceOption = {
  id: string;
  name: string;
  basePricePaise: number;
  govtFeePaise: number | null;
};
type StateOption = { id: string; name: string };

/** Self-contained Sales button for the enquiry detail page — wraps the controlled SalesDialog. */
export function SalesDialogButton({
  enquiryId,
  source,
  defaults,
  services,
  states,
}: {
  enquiryId: string;
  source: EnquirySource;
  defaults: {
    name: string;
    phone: string;
    email?: string | null;
    address?: string | null;
    pincode?: string | null;
    serviceInterestedId?: string | null;
  };
  services: ServiceOption[];
  states: StateOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button className="flex-1" onClick={() => setOpen(true)}>
        Sales
      </Button>
      <SalesDialog
        enquiryId={enquiryId}
        open={open}
        onOpenChange={setOpen}
        source={source}
        defaults={defaults}
        services={services}
        states={states}
      />
    </>
  );
}
