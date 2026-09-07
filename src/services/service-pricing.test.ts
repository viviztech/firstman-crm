import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { serviceStatePrices, services } from "@/db/schema/catalog";
import { states } from "@/db/schema/geography";
import { makeScope } from "@/lib/test-scope";
import {
  computeServiceQuote,
  deleteServiceStatePrice,
  listServiceStatePrices,
  setServiceStatePriceComponents,
} from "@/services/service-pricing";

// Uses the seeded pvt-ltd-registration service and the seeded Tamil Nadu row — matches the real
// fee-breakdown example this feature was built for (Name Approval/DSC/DIN/SPICe/MOA/AOA, ADR 0010).

describe("service-pricing (integration)", () => {
  const managerId = randomUUID();
  const managerScope = makeScope(managerId, "manager");
  let serviceId: string;
  let stateId: string;
  /** The service's flat professional fee — now always the quote's leading line, state-specific
   *  breakdown or not, so the fixture totals below are expressed relative to it. */
  let basePricePaise: number;

  beforeAll(async () => {
    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration service not found");
    serviceId = service.id;
    basePricePaise = service.basePricePaise;

    const state = await db.query.states.findFirst({
      where: eq(states.name, "Tamil Nadu"),
    });
    if (!state) throw new Error("Seed geography first — Tamil Nadu not found");
    stateId = state.id;

    await db.insert(user).values({
      id: managerId,
      name: "Service Pricing Test Manager",
      email: `service-pricing-manager-${managerId}@test.local`,
      emailVerified: true,
      role: "manager",
    });
  });

  afterAll(async () => {
    await db
      .delete(serviceStatePrices)
      .where(
        and(eq(serviceStatePrices.serviceId, serviceId), eq(serviceStatePrices.stateId, stateId)),
      );
    await db.delete(user).where(eq(user.id, managerId));
  });

  it("falls back to a flat professional/govt fee breakdown when no state pricing is configured", async () => {
    await deleteServiceStatePrice(serviceId, stateId, managerScope).catch(() => {});

    const service = await db.query.services.findFirst({ where: eq(services.id, serviceId) });
    const quote = await computeServiceQuote(serviceId, "Tamil Nadu");

    expect(quote?.stateSpecific).toBe(false);
    expect(quote?.totalPaise).toBe((service?.basePricePaise ?? 0) + (service?.govtFeePaise ?? 0));
  });

  it("returns the flat fallback for a state name that doesn't match any master record", async () => {
    const quote = await computeServiceQuote(serviceId, "Not A Real State");
    expect(quote?.stateSpecific).toBe(false);
  });

  it("returns null for a service that doesn't exist", async () => {
    const quote = await computeServiceQuote(randomUUID(), null);
    expect(quote).toBeNull();
  });

  it("uses the state-specific breakdown once configured, matching the TN fee example", async () => {
    const feeComponents = [
      { label: "Name Approval", amountPaise: 100000, perDirector: false, perLakhCapital: false },
      { label: "DSC", amountPaise: 150000, perDirector: true, perLakhCapital: false },
      { label: "DIN", amountPaise: 50000, perDirector: true, perLakhCapital: false },
      { label: "SPICe Form", amountPaise: 15000, perDirector: false, perLakhCapital: false },
      { label: "MOA", amountPaise: 500000, perDirector: false, perLakhCapital: true },
      { label: "AOA", amountPaise: 500000, perDirector: false, perLakhCapital: true },
    ];

    const result = await setServiceStatePriceComponents(
      serviceId,
      { stateId, feeComponents },
      managerScope,
    );
    expect(result.ok).toBe(true);

    // Case-insensitive match; no director/capital given, so both default to 1 (1 director, ₹1L capital).
    const quote = await computeServiceQuote(serviceId, "tamil nadu");
    expect(quote?.stateSpecific).toBe(true);
    expect(quote?.totalPaise).toBe(basePricePaise + 1315000);
    expect(quote?.components).toHaveLength(7); // Professional fee + the 6 state components
    const professionalFee = quote?.components[0];
    expect(professionalFee).toEqual({
      label: "Professional fee",
      qty: 1,
      ratePaise: basePricePaise,
      amountPaise: basePricePaise,
    });
    const dsc = quote?.components.find((c) => c.label === "DSC");
    expect(dsc).toEqual({ label: "DSC", qty: 1, ratePaise: 150000, amountPaise: 150000 });
    const moa = quote?.components.find((c) => c.label === "MOA");
    expect(moa).toEqual({ label: "MOA", qty: 1, ratePaise: 500000, amountPaise: 500000 });

    const listed = await listServiceStatePrices(serviceId);
    const tnRow = listed.find((row) => row.stateId === stateId);
    expect(tnRow?.feeComponents).toHaveLength(6);
  });

  it("multiplies perDirector components by the enquiry's director count, leaving flat/perLakhCapital ones alone", async () => {
    const quote = await computeServiceQuote(serviceId, "Tamil Nadu", 2);
    expect(quote?.totalPaise).toBe(basePricePaise + 1515000); // +150000 DSC +50000 DIN for the 2nd director

    const dsc = quote?.components.find((c) => c.label === "DSC");
    const nameApproval = quote?.components.find((c) => c.label === "Name Approval");
    expect(dsc).toEqual({ label: "DSC", qty: 2, ratePaise: 150000, amountPaise: 300000 });
    expect(nameApproval).toEqual({
      label: "Name Approval",
      qty: 1,
      ratePaise: 100000,
      amountPaise: 100000,
    });
  });

  it("multiplies perLakhCapital components by whole lakhs of authorized capital, leaving flat/perDirector ones alone", async () => {
    // ₹3,00,000 authorized capital = 3 lakh.
    const quote = await computeServiceQuote(serviceId, "Tamil Nadu", null, 30000000);
    expect(quote?.totalPaise).toBe(basePricePaise + 3315000); // MOA+AOA each ×3 instead of ×1: net +2,000,000

    const moa = quote?.components.find((c) => c.label === "MOA");
    const dsc = quote?.components.find((c) => c.label === "DSC");
    expect(moa).toEqual({ label: "MOA", qty: 3, ratePaise: 500000, amountPaise: 1500000 });
    expect(dsc).toEqual({ label: "DSC", qty: 1, ratePaise: 150000, amountPaise: 150000 });
  });

  it("rounds a partial-lakh capital amount up to the next whole lakh", async () => {
    // ₹1,00,001 rounds up to 2 lakh.
    const quote = await computeServiceQuote(serviceId, "Tamil Nadu", null, 10000100);
    const moa = quote?.components.find((c) => c.label === "MOA");
    expect(moa?.qty).toBe(2);
  });

  it("combines director count and capital amount independently on the same quote", async () => {
    const quote = await computeServiceQuote(serviceId, "Tamil Nadu", 2, 30000000);
    expect(quote?.totalPaise).toBe(basePricePaise + 3515000);
  });

  it("treats a missing, zero, or fractional director count as 1, and a missing/zero capital as ₹1L", async () => {
    const withNull = await computeServiceQuote(serviceId, "Tamil Nadu", null);
    const withZero = await computeServiceQuote(serviceId, "Tamil Nadu", 0, 0);
    const withFraction = await computeServiceQuote(serviceId, "Tamil Nadu", 1.9);
    expect(withNull?.totalPaise).toBe(basePricePaise + 1315000);
    expect(withZero?.totalPaise).toBe(basePricePaise + 1315000);
    expect(withFraction?.totalPaise).toBe(basePricePaise + 1315000);
  });

  it("replaces the whole breakdown rather than appending on a second save", async () => {
    await setServiceStatePriceComponents(
      serviceId,
      {
        stateId,
        feeComponents: [
          {
            label: "Name Approval",
            amountPaise: 100000,
            perDirector: false,
            perLakhCapital: false,
          },
        ],
      },
      managerScope,
    );

    const listed = await listServiceStatePrices(serviceId);
    const tnRow = listed.find((row) => row.stateId === stateId);
    expect(tnRow?.feeComponents).toEqual([
      { label: "Name Approval", amountPaise: 100000, perDirector: false, perLakhCapital: false },
    ]);
  });

  it("falls back to flat pricing again after the state row is deleted", async () => {
    const result = await deleteServiceStatePrice(serviceId, stateId, managerScope);
    expect(result.ok).toBe(true);

    const quote = await computeServiceQuote(serviceId, "Tamil Nadu");
    expect(quote?.stateSpecific).toBe(false);

    const secondDelete = await deleteServiceStatePrice(serviceId, stateId, managerScope);
    expect(secondDelete.ok).toBe(false);
  });
});
