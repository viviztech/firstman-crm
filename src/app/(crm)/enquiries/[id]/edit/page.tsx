import { PencilLine } from "lucide-react";
import { notFound } from "next/navigation";
import { updateEnquiryAction } from "@/actions/enquiries";
import { toScope } from "@/actions/shared";
import { STAT_COLOR_CLASSES } from "@/components/dashboard/dashboard-colors";
import { EnquiryForm } from "@/components/enquiries/enquiry-form";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/session";
import { cn } from "@/lib/utils";
import { listServiceOptions } from "@/services/catalog";
import { getEnquiry } from "@/services/enquiries";
import { listReferralPartnerOptions } from "@/services/referral-partners";
import { listAssignableStaff } from "@/services/users";

export default async function EditEnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("super_admin", "manager", "executive");
  const { id } = await params;

  const [enquiry, staff, services, referralPartners] = await Promise.all([
    getEnquiry(id, await toScope(user)),
    listAssignableStaff(),
    listServiceOptions(),
    listReferralPartnerOptions(),
  ]);

  if (!enquiry) {
    notFound();
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Card className={cn("border-l-4", STAT_COLOR_CLASSES.purple.border)}>
        <CardContent className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl",
              STAT_COLOR_CLASSES.purple.chip,
            )}
          >
            <PencilLine className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Edit enquiry</h1>
            <p className="text-sm text-muted-foreground">Update {enquiry.name}'s details.</p>
          </div>
        </CardContent>
      </Card>
      <EnquiryForm
        action={updateEnquiryAction.bind(null, id)}
        role={user.role}
        staff={staff}
        services={services}
        referralPartners={referralPartners}
        submitLabel="Save changes"
        redirectTo={{ mode: "edit", enquiryId: id }}
        defaultValues={{
          name: enquiry.name,
          phone: enquiry.phone,
          email: enquiry.email,
          address: enquiry.address,
          city: enquiry.city,
          pincode: enquiry.pincode,
          source: enquiry.source,
          serviceInterestedId: enquiry.serviceInterestedId,
          referralPartnerId: enquiry.referralPartnerId,
          assignedTo: enquiry.assignedTo,
          nextFollowUpAt: enquiry.nextFollowUpAt,
          notes: enquiry.notes,
        }}
      />
    </div>
  );
}
