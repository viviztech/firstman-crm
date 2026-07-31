import { getSetting } from "@/services/settings";

export type CompanyProfile = {
  name: string;
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
  address: "",
  gstin: "",
  logoUrl: "",
  phone: "",
  email: "",
  whatsappNumber: "",
  areasServed: "Tamil Nadu",
};

export async function getCompanyProfile(): Promise<CompanyProfile> {
  return getSetting<CompanyProfile>("companyProfile", DEFAULT_COMPANY_PROFILE);
}
