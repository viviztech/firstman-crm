import { getSetting } from "@/services/settings";

export type CompanyProfile = {
  /** Brand name, used in UI copy. */
  name: string;
  /** Registered entity name, used in legal/schema contexts (footer copyright, Organization JSON-LD). */
  legalName: string;
  /** LLP Identification Number. */
  llpin: string;
  /** Full postal address as shown to visitors (footer, contact page). */
  address: string;
  /** Structured address parts, for PostalAddress JSON-LD — kept separate from `address` so existing display copy is untouched. */
  addressStreet: string;
  addressLocality: string;
  addressRegion: string;
  addressPostalCode: string;
  addressCountry: string;
  gstin: string;
  logoUrl: string;
  /** Public contact channels — the marketing site only renders a Call/WhatsApp CTA once these are set. */
  phone: string;
  email: string;
  whatsappNumber: string;
  areasServed: string;
};

/**
 * Defaults until a settings UI lets admins edit this — reads through the same generic
 * `settings` key/value store, so an eventual settings page needs no schema change.
 */
const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  name: "FirstMan Corporate Services",
  legalName: "FirstMan Corporate Services LLP",
  llpin: "AAI-5319",
  address: "W-426A, Second Floor, 2nd Avenue, C Sector, Anna Nagar West, Chennai - 600 101",
  addressStreet: "W-426A, Second Floor, 2nd Avenue, C Sector, Anna Nagar West",
  addressLocality: "Chennai",
  addressRegion: "Tamil Nadu",
  addressPostalCode: "600101",
  addressCountry: "IN",
  gstin: "33AAFFF0744H1ZS",
  logoUrl: "/logo.png",
  phone: "+91 97878 97000",
  email: "",
  whatsappNumber: "",
  areasServed: "Across India",
};

export async function getCompanyProfile(): Promise<CompanyProfile> {
  // Merged rather than replaced outright: a settings row saved before a field existed on this
  // type (e.g. before addressLocality was added) shouldn't resurrect that field as undefined.
  const stored = await getSetting<Partial<CompanyProfile>>("companyProfile", {});
  return { ...DEFAULT_COMPANY_PROFILE, ...stored };
}
