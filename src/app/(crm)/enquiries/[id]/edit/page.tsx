import { notFound } from "next/navigation";
import { updateEnquiryAction } from "@/actions/enquiries";
import { toScope } from "@/actions/shared";
import { EnquiryForm } from "@/components/enquiries/enquiry-form";
import { requireRole } from "@/lib/session";
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
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Edit enquiry</h1>
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
