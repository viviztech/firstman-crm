import { getSetting } from "@/services/settings";

export type CompanyProfile = {
  name: string;
  address: string;
  gstin: string;
  logoUrl: string;
};

/**
 * Defaults until Phase 8's settings UI lets admins edit this — reads through the same
 * generic `settings` key/value store, so the eventual settings page needs no schema change.
 */
const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  name: "FirstMan Corporate Services",
  address: "",
  gstin: "",
  logoUrl: "",
};

export async function getCompanyProfile(): Promise<CompanyProfile> {
  return getSetting<CompanyProfile>("companyProfile", DEFAULT_COMPANY_PROFILE);
}
