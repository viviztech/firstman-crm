import { createEnquiryAction } from "@/actions/enquiries";
import { EnquiryForm } from "@/components/enquiries/enquiry-form";
import { requireRole } from "@/lib/session";
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
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">New enquiry</h1>
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
