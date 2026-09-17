import { PencilLine } from "lucide-react";
import { notFound } from "next/navigation";
import { updateEnquiryAction } from "@/actions/enquiries";
import { toScope } from "@/actions/shared";
import { EnquiryForm } from "@/components/enquiries/enquiry-form";
import { EnquiryPageHeader } from "@/components/enquiries/enquiry-page-header";
import { requireRole } from "@/lib/session";
import { listServiceOptions } from "@/services/catalog";
import { getEnquiry } from "@/services/enquiries";
import { listStates } from "@/services/geography";
import { listReferralPartnerOptions } from "@/services/referral-partners";
import { listAssignableStaff } from "@/services/users";

export default async function EditEnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("super_admin", "manager", "executive");
  const { id } = await params;

  const [enquiry, staff, services, referralPartners, states] = await Promise.all([
    getEnquiry(id, await toScope(user)),
    listAssignableStaff(),
    listServiceOptions(),
    listReferralPartnerOptions(),
    listStates(),
  ]);

  if (!enquiry) {
    notFound();
  }

  return (
    <div className="enquiry-workflow mx-auto flex w-full max-w-4xl flex-col gap-5">
      <EnquiryPageHeader
        title="Edit enquiry"
        description={`Keep ${enquiry.name}'s contact, service, ownership, and follow-up details current.`}
        icon={PencilLine}
        tone="violet"
        backHref={`/enquiries/${id}`}
        backLabel="Back to enquiry"
      />
      <EnquiryForm
        action={updateEnquiryAction.bind(null, id)}
        role={user.role}
        staff={staff}
        services={services}
        referralPartners={referralPartners}
        states={states}
        submitLabel="Save changes"
        redirectTo={{ mode: "edit", enquiryId: id }}
        defaultValues={{
          name: enquiry.name,
          phone: enquiry.phone,
          email: enquiry.email,
          address: enquiry.address,
          city: enquiry.city,
          state: enquiry.state,
          pincode: enquiry.pincode,
          numberOfDirectors: enquiry.numberOfDirectors,
          capitalAmountPaise: enquiry.capitalAmountPaise,
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
