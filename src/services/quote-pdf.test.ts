import { randomUUID } from "node:crypto";
import { eq, ilike } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { services } from "@/db/schema/catalog";
import { enquiries } from "@/db/schema/enquiries";
import { quotes } from "@/db/schema/quotes";
import { renderQuotePdf } from "@/services/quote-pdf";
import { createQuoteForEnquiry } from "@/services/quotes";

describe("renderQuotePdf (integration)", () => {
  const managerId = randomUUID();
  const enquiryIds: string[] = [];

  beforeAll(async () => {
    await db.insert(user).values({
      id: managerId,
      name: "Quote PDF Test Manager",
      email: `quote-pdf-manager-${managerId}@test.local`,
      emailVerified: true,
      role: "manager",
    });
  });

  afterAll(async () => {
    for (const id of enquiryIds) {
      await db.delete(quotes).where(eq(quotes.enquiryId, id));
    }
    await db.delete(enquiries).where(ilike(enquiries.phone, "+919876660%"));
    await db.delete(user).where(eq(user.id, managerId));
  });

  it("renders a real quote to a non-empty PDF buffer with a valid PDF header, GST applied only on the Professional fee", async () => {
    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration service not found");

    const phone = `+919876660${randomUUID().slice(0, 6)}`;
    const [enquiry] = await db
      .insert(enquiries)
      .values({
        name: "Quote PDF Fixture",
        phone,
        serviceInterestedId: service.id,
        source: "website",
      })
      .returning();
    if (!enquiry) throw new Error("setup failed");
    enquiryIds.push(enquiry.id);

    const quote = await createQuoteForEnquiry(enquiry.id, null);
    if (!quote) throw new Error("setup failed");

    // GST is charged only on the Professional fee line, never the flat Government fee line.
    const professionalFee = quote.lineItems.find((item) => item.label === "Professional fee");
    if (!professionalFee) throw new Error("setup failed — no Professional fee line");
    expect(quote.gstAmountPaise).toBe(Math.round((professionalFee.amountPaise * 18) / 100));
    expect(quote.totalPaise).toBe(quote.subtotalPaise + quote.gstAmountPaise);

    const buffer = await renderQuotePdf(quote.id);
    expect(buffer).not.toBeNull();
    expect(buffer?.byteLength).toBeGreaterThan(0);
    expect(buffer?.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("returns null for a quote that doesn't exist", async () => {
    expect(await renderQuotePdf(randomUUID())).toBeNull();
  });
});
