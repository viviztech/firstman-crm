import { randomUUID } from "node:crypto";
import { and, eq, ilike } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { serviceStatePrices, services } from "@/db/schema/catalog";
import { enquiries } from "@/db/schema/enquiries";
import { states } from "@/db/schema/geography";
import { quotes } from "@/db/schema/quotes";
import { makeScope } from "@/lib/test-scope";
import { createQuoteForEnquiry, formatQuoteNo, quoteYearMonth } from "@/services/quotes";
import { setServiceStatePriceComponents } from "@/services/service-pricing";

describe("quoteYearMonth / formatQuoteNo (pure)", () => {
  it("formats a 2-digit year + 2-digit month", () => {
    expect(quoteYearMonth(new Date("2026-01-05T00:00:00Z"))).toBe("2601");
    expect(quoteYearMonth(new Date("2026-12-25T00:00:00Z"))).toBe("2612");
  });

  it("formats the quote number with a zero-padded 5-digit sequence", () => {
    expect(formatQuoteNo("2601", 1)).toBe("FMQT260100001");
    expect(formatQuoteNo("2601", 42)).toBe("FMQT260100042");
  });
});

describe("createQuoteForEnquiry (integration)", () => {
  const enquiryIds: string[] = [];
  const managerId = randomUUID();
  let serviceId: string;
  let stateId: string;
  /** Professional fee now always leads the quote — fixture totals are relative to it. */
  let basePricePaise: number;

  beforeAll(async () => {
    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration service not found");
    serviceId = service.id;
    basePricePaise = service.basePricePaise;

    const state = await db.query.states.findFirst({ where: eq(states.name, "Tamil Nadu") });
    if (!state) throw new Error("Seed geography first — Tamil Nadu not found");
    stateId = state.id;

    await db.insert(user).values({
      id: managerId,
      name: "Quote Test Manager",
      email: `quote-manager-${managerId}@test.local`,
      emailVerified: true,
      role: "manager",
    });
  });

  afterAll(async () => {
    for (const id of enquiryIds) {
      await db.delete(quotes).where(eq(quotes.enquiryId, id));
    }
    await db.delete(enquiries).where(ilike(enquiries.phone, "+919876640%"));
    await db
      .delete(serviceStatePrices)
      .where(
        and(eq(serviceStatePrices.serviceId, serviceId), eq(serviceStatePrices.stateId, stateId)),
      );
    await db.delete(user).where(eq(user.id, managerId));
  });

  async function insertEnquiry(overrides: {
    phone: string;
    email?: string | null;
    state?: string | null;
    serviceInterestedId?: string | null;
    numberOfDirectors?: number | null;
    capitalAmountPaise?: number | null;
  }) {
    const [created] = await db
      .insert(enquiries)
      .values({
        name: "Quote Fixture",
        phone: overrides.phone,
        email: overrides.email ?? null,
        state: overrides.state ?? null,
        serviceInterestedId: overrides.serviceInterestedId ?? null,
        numberOfDirectors: overrides.numberOfDirectors ?? null,
        capitalAmountPaise: overrides.capitalAmountPaise ?? null,
        source: "website",
      })
      .returning();
    if (!created) throw new Error("failed to insert fixture enquiry");
    enquiryIds.push(created.id);
    return created;
  }

  it("returns null when the enquiry has no interested service", async () => {
    const phone = `+919876640${randomUUID().slice(0, 6)}`;
    const created = await insertEnquiry({ phone });

    const quote = await createQuoteForEnquiry(created.id, null);
    expect(quote).toBeNull();
  });

  it("returns null for an enquiry that doesn't exist", async () => {
    const quote = await createQuoteForEnquiry(randomUUID(), null);
    expect(quote).toBeNull();
  });

  it("snapshots the state-specific fee breakdown when the enquiry names a state with configured pricing", async () => {
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
          { label: "DSC", amountPaise: 150000, perDirector: true, perLakhCapital: false },
          { label: "DIN", amountPaise: 50000, perDirector: true, perLakhCapital: false },
          { label: "SPICe Form", amountPaise: 15000, perDirector: false, perLakhCapital: false },
          { label: "MOA", amountPaise: 500000, perDirector: false, perLakhCapital: true },
          { label: "AOA", amountPaise: 500000, perDirector: false, perLakhCapital: true },
        ],
      },
      makeScope(managerId, "manager"),
    );

    const phone = `+919876640${randomUUID().slice(0, 6)}`;
    const created = await insertEnquiry({
      phone,
      email: "quote-fixture@example.com",
      state: "Tamil Nadu",
      serviceInterestedId: serviceId,
    });

    const quote = await createQuoteForEnquiry(created.id, null);
    expect(quote).not.toBeNull();
    expect(quote?.quoteNo).toMatch(/^FMQT\d{9}$/);
    expect(quote?.enquiryId).toBe(created.id);
    expect(quote?.clientPhone).toBe(phone);
    expect(quote?.clientEmail).toBe("quote-fixture@example.com");
    expect(quote?.serviceId).toBe(serviceId);
    expect(quote?.stateName).toBe("Tamil Nadu");
    expect(quote?.numberOfDirectors).toBeNull();
    expect(quote?.subtotalPaise).toBe(basePricePaise + 1315000);
    // Default 18% GST rate, charged only on the Professional fee — never on the state's
    // government-fee components (Name Approval/DSC/DIN/SPICe/MOA/AOA).
    expect(quote?.gstRate).toBe(18);
    const gstAmountPaise = Math.round((basePricePaise * 18) / 100);
    expect(quote?.gstAmountPaise).toBe(gstAmountPaise);
    expect(quote?.totalPaise).toBe(basePricePaise + 1315000 + gstAmountPaise);
    expect(quote?.lineItems).toHaveLength(7); // Professional fee + the 6 state components
    expect(quote?.lineItems[0]).toEqual({
      label: "Professional fee",
      qty: 1,
      ratePaise: basePricePaise,
      amountPaise: basePricePaise,
    });
    expect(quote?.sentAt).toBeNull();
  });

  it("snapshots the enquiry's director count and multiplies perDirector line items", async () => {
    const phone = `+919876640${randomUUID().slice(0, 6)}`;
    const created = await insertEnquiry({
      phone,
      state: "Tamil Nadu",
      serviceInterestedId: serviceId,
      numberOfDirectors: 3,
    });

    const quote = await createQuoteForEnquiry(created.id, null);
    expect(quote?.numberOfDirectors).toBe(3);
    // Professional fee + flat lines (100000+15000+500000+500000=1115000) + 3x DSC (450000) + 3x DIN (150000)
    expect(quote?.subtotalPaise).toBe(basePricePaise + 1715000);
    const gstAmountPaise = Math.round((basePricePaise * 18) / 100);
    expect(quote?.totalPaise).toBe(basePricePaise + 1715000 + gstAmountPaise);
    const lineItems = quote?.lineItems ?? [];
    const dsc = lineItems.find((item) => item.label === "DSC");
    expect(dsc).toMatchObject({ qty: 3, amountPaise: 450000 });
  });

  it("snapshots the enquiry's authorized capital and multiplies perLakhCapital line items", async () => {
    const phone = `+919876640${randomUUID().slice(0, 6)}`;
    const created = await insertEnquiry({
      phone,
      state: "Tamil Nadu",
      serviceInterestedId: serviceId,
      capitalAmountPaise: 30000000, // ₹3,00,000 = 3 lakh
    });

    const quote = await createQuoteForEnquiry(created.id, null);
    expect(quote?.capitalAmountPaise).toBe(30000000);
    // Base 1,315,000 with MOA/AOA at 1x each; at 3x each that's +1,000,000 per side = +2,000,000.
    expect(quote?.subtotalPaise).toBe(basePricePaise + 3315000);
    const gstAmountPaise = Math.round((basePricePaise * 18) / 100);
    expect(quote?.totalPaise).toBe(basePricePaise + 3315000 + gstAmountPaise);
    const lineItems = quote?.lineItems ?? [];
    const moa = lineItems.find((item) => item.label === "MOA");
    expect(moa).toMatchObject({ qty: 3, amountPaise: 1500000 });
  });

  it("falls back to the flat professional/govt fee when the enquiry has no state", async () => {
    const phone = `+919876640${randomUUID().slice(0, 6)}`;
    const created = await insertEnquiry({ phone, serviceInterestedId: serviceId });

    const service = await db.query.services.findFirst({ where: eq(services.id, serviceId) });
    const quote = await createQuoteForEnquiry(created.id, null);

    expect(quote?.stateName).toBeNull();
    const subtotalPaise = (service?.basePricePaise ?? 0) + (service?.govtFeePaise ?? 0);
    expect(quote?.subtotalPaise).toBe(subtotalPaise);
    // GST applies only to the Professional fee (basePricePaise), never the flat Government fee line.
    const gstAmountPaise = Math.round(((service?.basePricePaise ?? 0) * 18) / 100);
    expect(quote?.gstAmountPaise).toBe(gstAmountPaise);
    expect(quote?.totalPaise).toBe(subtotalPaise + gstAmountPaise);
  });
});
