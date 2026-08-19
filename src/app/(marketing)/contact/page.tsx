import { Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { MarketingEnquiryForm } from "@/components/marketing/enquiry-form";
import { getCompanyProfile } from "@/services/company-profile";
import { getPublicServices } from "@/services/marketing-catalog";

export const metadata: Metadata = {
  title: "Contact a business services expert — FirstMan",
  description:
    "Discuss company registration, tax, licensing, accounting, IP or compliance requirements with FirstMan.",
};
export default async function ContactPage() {
  const [profile, services] = await Promise.all([getCompanyProfile(), getPublicServices()]);
  return (
    <div className="marketing-site bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[.8fr_1.2fr] lg:px-8 lg:py-24">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <p className="text-xs font-bold tracking-[.18em] text-pink-700 uppercase">
            Speak with a specialist
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-.04em] text-slate-950 sm:text-5xl">
            Start with a clear plan.
          </h1>
          <p className="mt-5 leading-7 text-slate-600">
            Tell us the outcome you need. We’ll identify prerequisites, order of work, realistic
            fees, and next steps.
          </p>
          <ul className="mt-10 space-y-5 text-sm text-slate-600">
            <li className="flex gap-3">
              <MapPin className="size-4 shrink-0 text-pink-600" />
              {profile.address || `Serving ${profile.areasServed}`}
            </li>
            {profile.phone ? (
              <li>
                <a href={`tel:${profile.phone}`} className="flex gap-3 hover:text-slate-950">
                  <Phone className="size-4 text-pink-600" />
                  {profile.phone}
                </a>
              </li>
            ) : null}
            {profile.email ? (
              <li>
                <a href={`mailto:${profile.email}`} className="flex gap-3 hover:text-slate-950">
                  <Mail className="size-4 text-pink-600" />
                  {profile.email}
                </a>
              </li>
            ) : null}
          </ul>
        </div>
        <div>
          <p className="mb-5 text-sm leading-6 text-slate-600">
            Complete the form and our team will respond during business hours. No payment is
            required to discuss your requirement.
          </p>
          <MarketingEnquiryForm services={services.map((s) => ({ id: s.id, name: s.name }))} />
        </div>
      </div>
    </div>
  );
}
