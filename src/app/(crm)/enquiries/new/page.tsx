import { UserPlus } from "lucide-react";
import { createEnquiryAction } from "@/actions/enquiries";
import { EnquiryForm } from "@/components/enquiries/enquiry-form";
import { EnquiryPageHeader } from "@/components/enquiries/enquiry-page-header";
import { requireRole } from "@/lib/session";
import { listServiceOptions } from "@/services/catalog";
import { listStates } from "@/services/geography";
import { listReferralPartnerOptions } from "@/services/referral-partners";
import { listAssignableStaff } from "@/services/users";

export default async function NewEnquiryPage() {
  const user = await requireRole("super_admin", "manager", "executive");
  const [staff, services, referralPartners, states] = await Promise.all([
    listAssignableStaff(),
    listServiceOptions(),
    listReferralPartnerOptions(),
    listStates(),
  ]);

  return (
    <div className="enquiry-workflow mx-auto flex w-full max-w-4xl flex-col gap-5">
      <EnquiryPageHeader
        title="New enquiry"
        description="Capture the opportunity, assign an owner, and schedule the next meaningful step."
        icon={UserPlus}
      />
      <EnquiryForm
        action={createEnquiryAction}
        role={user.role}
        staff={staff}
        services={services}
        referralPartners={referralPartners}
        states={states}
        submitLabel="Create enquiry"
        redirectTo={{ mode: "create" }}
      />
    </div>
  );
}
