import { Handshake } from "lucide-react";
import { notFound } from "next/navigation";
import { toScope } from "@/actions/shared";
import { STAT_COLOR_CLASSES } from "@/components/dashboard/dashboard-colors";
import { SalesForm } from "@/components/enquiries/sales-form";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/session";
import { cn } from "@/lib/utils";
import { listServicesForOrders } from "@/services/catalog";
import { getEnquiry } from "@/services/enquiries";
import { listStates } from "@/services/geography";

export default async function EnquirySalesPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("super_admin", "manager", "executive");
  const { id } = await params;

  const [enquiry, services, states] = await Promise.all([
    getEnquiry(id, await toScope(user)),
    listServicesForOrders(),
    listStates(),
  ]);
  if (!enquiry) {
    notFound();
  }

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <Card className={cn("border-l-4", STAT_COLOR_CLASSES.green.border)}>
        <CardContent className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl",
              STAT_COLOR_CLASSES.green.chip,
            )}
          >
            <Handshake className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Close as a sale</h1>
            <p className="text-sm text-muted-foreground">
              Review {enquiry.name}&apos;s details, choose a service and price, then create the
              client and job card.
            </p>
          </div>
        </CardContent>
      </Card>
      <SalesForm
        enquiryId={id}
        source={enquiry.source}
        defaults={{
          name: enquiry.name,
          phone: enquiry.phone,
          email: enquiry.email,
          address: enquiry.address,
          city: enquiry.city,
          pincode: enquiry.pincode,
          serviceInterestedId: enquiry.serviceInterestedId,
        }}
        services={services}
        states={states}
      />
    </div>
  );
}
