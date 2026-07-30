import { describe, expect, it } from "vitest";
import { CATALOG_SEED } from "@/db/seed-data/catalog";

describe("CATALOG_SEED", () => {
  const allServices = CATALOG_SEED.flatMap((category) => category.services);

  it("has unique slugs across all categories", () => {
    const slugs = allServices.map((service) => service.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every service at least one checklist step and required document", () => {
    for (const service of allServices) {
      expect(service.checklistTemplate.length).toBeGreaterThan(0);
      expect(service.requiredDocuments.length).toBeGreaterThan(0);
    }
  });

  it("keeps checklist day offsets non-negative and within the estimated turnaround", () => {
    for (const service of allServices) {
      for (const step of service.checklistTemplate) {
        expect(step.dayOffset).toBeGreaterThanOrEqual(0);
        expect(step.dayOffset).toBeLessThanOrEqual(service.estimatedDays);
      }
    }
  });

  it("sets a recurrence whenever a service is marked recurring, and none when it isn't", () => {
    for (const service of allServices) {
      if (service.isRecurring) {
        expect(service.recurrence).toBeDefined();
      } else {
        expect(service.recurrence).toBeUndefined();
      }
    }
  });

  it("includes the services named in the build spec", () => {
    const names = allServices.map((service) => service.slug);
    expect(names).toEqual(
      expect.arrayContaining([
        "pvt-ltd-registration",
        "llp-registration",
        "opc-registration",
        "partnership-registration",
        "proprietorship-registration",
        "gst-registration",
        "gst-monthly-filing",
        "itr-filing",
        "annual-compliance-pvt-ltd",
        "annual-compliance-llp",
        "trademark-registration",
        "trademark-objection",
        "fssai-registration",
        "msme-udyam-registration",
        "iec-registration",
        "iso-certification",
        "dir-3-kyc",
      ]),
    );
  });
});
