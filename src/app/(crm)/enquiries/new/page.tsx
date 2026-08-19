import { UserPlus } from "lucide-react";
import { createEnquiryAction } from "@/actions/enquiries";
import { STAT_COLOR_CLASSES } from "@/components/dashboard/dashboard-colors";
import { EnquiryForm } from "@/components/enquiries/enquiry-form";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/session";
import { cn } from "@/lib/utils";
import { listServiceOptions } from "@/services/catalog";
import { listReferralPartnerOptions } from "@/services/referral-partners";
import { listAssignableStaff } from "@/services/users";

export default async function NewEnquiryPage() {
  const user = await requireRole("super_admin", "manager", "executive");
  const [staff, services, referralPartners] = await Promise.all([
    listAssignableStaff(),
    listServiceOptions(),
    listReferralPartnerOptions(),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Card className={cn("border-l-4", STAT_COLOR_CLASSES.blue.border)}>
        <CardContent className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl",
              STAT_COLOR_CLASSES.blue.chip,
            )}
          >
            <UserPlus className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">New enquiry</h1>
            <p className="text-sm text-muted-foreground">
              Capture a new lead so it can be followed up and converted.
            </p>
          </div>
        </CardContent>
      </Card>
      <EnquiryForm
        action={createEnquiryAction}
        role={user.role}
        staff={staff}
        services={services}
        referralPartners={referralPartners}
        submitLabel="Create enquiry"
        redirectTo={{ mode: "create" }}
      />
    </div>
  );
}
