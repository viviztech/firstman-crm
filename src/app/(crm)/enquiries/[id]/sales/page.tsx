import { Handshake } from "lucide-react";
import { notFound } from "next/navigation";
import { toScope } from "@/actions/shared";
import { EnquiryPageHeader } from "@/components/enquiries/enquiry-page-header";
import { SalesForm } from "@/components/enquiries/sales-form";
import { requireRole } from "@/lib/session";
import { listServicesForOrders } from "@/services/catalog";
import { getEnquiry } from "@/services/enquiries";
import { listStates } from "@/services/geography";
import { getApprovedQuoteSummaryForEnquiry } from "@/services/quotes";

export default async function EnquirySalesPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("super_admin", "manager", "executive");
  const { id } = await params;

  const [enquiry, services, states, approvedQuote] = await Promise.all([
    getEnquiry(id, await toScope(user)),
    listServicesForOrders(),
    listStates(),
    getApprovedQuoteSummaryForEnquiry(id),
  ]);
  if (!enquiry) {
    notFound();
  }

  return (
    <div className="enquiry-workflow mx-auto flex w-full max-w-5xl flex-col gap-5">
      <EnquiryPageHeader
        title="Close as a sale"
        description={`Review ${enquiry.name}'s details, confirm the service and price, then create the client and job card.`}
        icon={Handshake}
        tone="green"
        backHref={`/enquiries/${id}`}
        backLabel="Back to enquiry"
      />
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
        approvedQuote={approvedQuote}
      />
    </div>
  );
}
