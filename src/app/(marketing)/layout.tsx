import type { ReactNode } from "react";
import { JsonLd } from "@/components/marketing/json-ld";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getAppUrl } from "@/lib/app-url";
import { getCompanyProfile } from "@/services/company-profile";

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const profile = await getCompanyProfile();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: profile.name,
          ...(profile.legalName ? { legalName: profile.legalName } : {}),
          url: getAppUrl("/"),
          areaServed: profile.areasServed,
          ...(profile.logoUrl ? { logo: getAppUrl(profile.logoUrl) } : {}),
          ...(profile.address ? { address: profile.address } : {}),
          ...(profile.gstin ? { taxID: profile.gstin } : {}),
          ...(profile.llpin
            ? { identifier: { "@type": "PropertyValue", name: "LLPIN", value: profile.llpin } }
            : {}),
          ...(profile.email || profile.phone
            ? {
                contactPoint: {
                  "@type": "ContactPoint",
                  contactType: "customer service",
                  ...(profile.phone ? { telephone: profile.phone } : {}),
                  ...(profile.email ? { email: profile.email } : {}),
                },
              }
            : {}),
        }}
      />
    </div>
  );
}
