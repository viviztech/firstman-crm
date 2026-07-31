import { Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { MarketingLeadForm } from "@/components/marketing/lead-form";
import { getCompanyProfile } from "@/services/company-profile";
import { getPublicCatalog } from "@/services/marketing-catalog";

export const metadata: Metadata = {
  title: "Contact — FirstMan Corporate Services",
  description: "Get in touch with FirstMan Corporate Services — we usually reply the same day.",
};

export default async function ContactPage() {
  const [profile, catalog] = await Promise.all([getCompanyProfile(), getPublicCatalog()]);
  const services = catalog.flatMap((category) => category.services);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="grid gap-12 md:grid-cols-[1fr_1.2fr]">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Let's talk</h1>
          <p className="mt-3 text-muted-foreground">
            Share a few details and we'll get back to you — usually the same day.
          </p>

          <ul className="mt-8 flex flex-col gap-4 text-sm">
            <li className="flex items-start gap-3">
              <MapPin className="text-brand mt-0.5 size-4.5 shrink-0" />
              <span>{profile.address || `Serving clients across ${profile.areasServed}`}</span>
            </li>
            {profile.phone ? (
              <li className="flex items-start gap-3">
                <Phone className="text-brand mt-0.5 size-4.5 shrink-0" />
                <a href={`tel:${profile.phone}`} className="hover:underline">
                  {profile.phone}
                </a>
              </li>
            ) : null}
            {profile.email ? (
              <li className="flex items-start gap-3">
                <Mail className="text-brand mt-0.5 size-4.5 shrink-0" />
                <a href={`mailto:${profile.email}`} className="hover:underline">
                  {profile.email}
                </a>
              </li>
            ) : null}
          </ul>
        </div>

        <MarketingLeadForm services={services.map((s) => ({ id: s.id, name: s.name }))} />
      </div>
    </div>
  );
}
