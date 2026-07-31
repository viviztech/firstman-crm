import { getSetting } from "@/services/settings";

export type CompanyProfile = {
  /** Brand name, used in UI copy. */
  name: string;
  /** Registered entity name, used in legal/schema contexts (footer copyright, Organization JSON-LD). */
  legalName: string;
  /** LLP Identification Number. */
  llpin: string;
  address: string;
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
  gstin: "33AAFFF0744H1ZS",
  logoUrl: "/logo.png",
  phone: "",
  email: "",
  whatsappNumber: "",
  areasServed: "Tamil Nadu",
};

export async function getCompanyProfile(): Promise<CompanyProfile> {
  return getSetting<CompanyProfile>("companyProfile", DEFAULT_COMPANY_PROFILE);
}
