import { describe, expect, it } from "vitest";
import {
  getServiceById,
  listCatalog,
  listServiceOptions,
  listServicesForOrders,
} from "@/services/catalog";

describe("listCatalog (integration)", () => {
  it("returns seeded categories ordered by sort, each with its services", async () => {
    const categories = await listCatalog();

    expect(categories.length).toBeGreaterThan(0);
    const sorts = categories.map((category) => category.sort);
    expect(sorts).toEqual([...sorts].sort((a, b) => a - b));

    const companyRegistration = categories.find(
      (category) => category.name === "Company Registration",
    );
    expect(companyRegistration).toBeDefined();
    expect(
      companyRegistration?.services.some((service) => service.slug === "pvt-ltd-registration"),
    ).toBe(true);
  });
});

describe("listServiceOptions (integration)", () => {
  it("returns a flat, alphabetically-ordered {id, name} list of services", async () => {
    const options = await listServiceOptions();

    expect(options.length).toBeGreaterThan(0);
    expect(options.some((option) => option.name === "GST Registration")).toBe(true);

    const names = options.map((option) => option.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

describe("listServicesForOrders (integration)", () => {
  it("returns pricing/turnaround fields the order form needs", async () => {
    const options = await listServicesForOrders();

    expect(options.length).toBeGreaterThan(0);
    const pvtLtd = options.find((option) => option.name === "Private Limited Company Registration");
    expect(pvtLtd).toBeDefined();
    expect(pvtLtd?.basePricePaise).toBeGreaterThan(0);
    expect(pvtLtd?.estimatedDays).toBeGreaterThan(0);
  });
});

describe("getServiceById (integration)", () => {
  it("returns the full service row, including checklistTemplate and requiredDocuments", async () => {
    const options = await listServiceOptions();
    const pvtLtd = options.find((option) => option.name === "Private Limited Company Registration");
    if (!pvtLtd) throw new Error("Seed catalog first");

    const service = await getServiceById(pvtLtd.id);
    expect(service?.slug).toBe("pvt-ltd-registration");
    expect(service?.checklistTemplate.length).toBeGreaterThan(0);
    expect(service?.requiredDocuments.length).toBeGreaterThan(0);
  });

  it("returns undefined for an unknown id", async () => {
    const service = await getServiceById("00000000-0000-0000-0000-000000000000");
    expect(service).toBeUndefined();
  });
});
