/**
 * Curated "frequently used" service slugs shown per vertical in the navbar's services
 * mega menu, in place of whatever happens to sort first in the catalog. Keyed by the
 * vertical's exact name from the seed catalog.
 */
export const MEGA_MENU_CURATED_SLUGS: Record<string, string[]> = {
  "Company Registration Services": [
    "pvt-ltd-registration",
    "llp-registration",
    "opc-registration",
    "proprietorship-registration",
    "partnership-registration",
  ],
  "Registration & Licensing": [
    "gst-registration",
    "trademark-registration",
    "msme-udyam-registration",
    "iec-registration",
    "fssai-registration",
  ],
  "Accounting & Auditing Services": [
    "gst-monthly-filing",
    "itr-filing",
    "tds-return-filing",
    "it-return-companies",
    "maintaining-books-of-accounts",
  ],
  "Secretarial Compliances Services": [
    "annual-compliance-pvt-ltd",
    "annual-compliance-llp",
    "dir-3-kyc",
    "addition-of-director",
    "appointment-of-auditor-adt-1",
  ],
  "IT Services": ["domain-registration", "hosting-services", "web-designing", "business-email"],
};
