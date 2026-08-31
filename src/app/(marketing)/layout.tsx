import { Fraunces } from "next/font/google";
import type { ReactNode } from "react";
import { GoogleAnalytics } from "@/components/marketing/google-analytics";
import {
  GoogleTagManagerNoScript,
  GoogleTagManagerScript,
} from "@/components/marketing/google-tag-manager";
import { JsonLd } from "@/components/marketing/json-ld";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getAppUrl } from "@/lib/app-url";
import { getCompanyProfile } from "@/services/company-profile";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz", "SOFT"],
});

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const profile = await getCompanyProfile();

  return (
    <div
      className={`${fraunces.variable} marketing-root flex min-h-screen flex-col bg-white text-slate-950`}
    >
      <GoogleTagManagerScript />
      <GoogleTagManagerNoScript />
      <GoogleAnalytics />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          name: profile.name,
          ...(profile.legalName ? { legalName: profile.legalName } : {}),
          url: getAppUrl("/"),
          areaServed: profile.areasServed,
          logo: getAppUrl("/brand/firstman-logo.png"),
          image: getAppUrl("/brand/firstman-logo.png"),
          ...(profile.address
            ? {
                address: {
                  "@type": "PostalAddress",
                  streetAddress: profile.addressStreet || profile.address,
                  addressLocality: profile.addressLocality,
                  addressRegion: profile.addressRegion,
                  postalCode: profile.addressPostalCode,
                  addressCountry: profile.addressCountry,
                },
              }
            : {}),
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
