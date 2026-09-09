import { randomUUID } from "node:crypto";
import { and, eq, ilike } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { serviceStatePrices, services } from "@/db/schema/catalog";
import { enquiries } from "@/db/schema/enquiries";
import { states } from "@/db/schema/geography";
import { messageLogs } from "@/db/schema/message-logs";
import { quotes } from "@/db/schema/quotes";
import {
  processEnquiryQuoteIssuedJob,
  processQuoteRevisedJob,
} from "@/jobs/enquiry-quote-notifications";
import { makeScope } from "@/lib/test-scope";
import { reviseQuote } from "@/services/quotes";
import { setServiceStatePriceComponents } from "@/services/service-pricing";

// WHATSAPP_TOKEN is empty in the test .env, so WhatsApp sends here exercise the log driver
// deterministically (see notify.test.ts). Email always attempts a real SMTP send.

describe("enquiry-quote-notifications (integration)", () => {
  const enquiryIds: string[] = [];
  const managerId = randomUUID();
  let serviceId: string;
  let stateId: string;
  /** Professional fee now always leads the quote — the fixture total below is relative to it. */
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
      name: "Quote Notification Test Manager",
      email: `quote-notif-manager-${managerId}@test.local`,
      emailVerified: true,
      role: "manager",
    });

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
  });

  afterAll(async () => {
    for (const id of enquiryIds) {
      const enquiryQuotes = await db.query.quotes.findMany({ where: eq(quotes.enquiryId, id) });
      for (const quote of enquiryQuotes) {
        await db.delete(messageLogs).where(eq(messageLogs.entityId, quote.id));
      }
      await db.delete(quotes).where(eq(quotes.enquiryId, id));
    }
    await db.delete(enquiries).where(ilike(enquiries.phone, "+919876650%"));
    await db
      .delete(serviceStatePrices)
      .where(
        and(eq(serviceStatePrices.serviceId, serviceId), eq(serviceStatePrices.stateId, stateId)),
      );
    await db.delete(user).where(eq(user.id, managerId));
  });

  it("generates a quote, logs a whatsapp document send and an email, and marks the quote sent", async () => {
    const phone = `+919876650${randomUUID().slice(0, 6)}`;
    const email = `quote-notif-${randomUUID()}@example.com`;
    const [enquiry] = await db
      .insert(enquiries)
      .values({
        name: "Quote Notification Fixture",
        phone,
        email,
        state: "Tamil Nadu",
        serviceInterestedId: serviceId,
        numberOfDirectors: 2,
        source: "website",
      })
      .returning();
    if (!enquiry) throw new Error("failed to insert fixture enquiry");
    enquiryIds.push(enquiry.id);

    await processEnquiryQuoteIssuedJob({ enquiryId: enquiry.id });

    const [quote] = await db.query.quotes.findMany({ where: eq(quotes.enquiryId, enquiry.id) });
    expect(quote).toBeDefined();
    expect(quote?.numberOfDirectors).toBe(2);
    // Professional fee + TN base 1,315,000 + one extra DSC+DIN for director 2.
    const subtotalPaise = basePricePaise + 1515000;
    expect(quote?.subtotalPaise).toBe(subtotalPaise);
    // Default 18% GST rate, charged only on the Professional fee component.
    const gstAmountPaise = Math.round((basePricePaise * 18) / 100);
    expect(quote?.gstAmountPaise).toBe(gstAmountPaise);
    expect(quote?.totalPaise).toBe(subtotalPaise + gstAmountPaise);
    expect(quote?.sentAt).not.toBeNull();

    const rows = await db.query.messageLogs.findMany({
      where: eq(messageLogs.entityId, quote?.id ?? ""),
    });
    const whatsappRow = rows.find((r) => r.channel === "whatsapp");
    const emailRow = rows.find((r) => r.channel === "email");
    expect(whatsappRow?.status).toBe("sent");
    expect(emailRow?.to).toBe(email);
    expect(["sent", "failed"]).toContain(emailRow?.status);
  });

  it("does nothing when the enquiry has no interested service", async () => {
    const phone = `+919876650${randomUUID().slice(0, 6)}`;
    const [enquiry] = await db
      .insert(enquiries)
      .values({ name: "No Service Fixture", phone, source: "website" })
      .returning();
    if (!enquiry) throw new Error("failed to insert fixture enquiry");
    enquiryIds.push(enquiry.id);

    await processEnquiryQuoteIssuedJob({ enquiryId: enquiry.id });

    const enquiryQuotes = await db.query.quotes.findMany({
      where: eq(quotes.enquiryId, enquiry.id),
    });
    expect(enquiryQuotes).toHaveLength(0);
  });

  it("sends a revised quote (staff edit) without regenerating it from the catalog", async () => {
    // Two full issue+send round trips (create, then revise, then send again) each attempt a real
    // SMTP send — comfortably over the 5s default when run back-to-back with the other tests.
    const phone = `+919876650${randomUUID().slice(0, 6)}`;
    const email = `quote-notif-revised-${randomUUID()}@example.com`;
    const [enquiry] = await db
      .insert(enquiries)
      .values({
        name: "Quote Revision Notification Fixture",
        phone,
        email,
        serviceInterestedId: serviceId,
        source: "website",
      })
      .returning();
    if (!enquiry) throw new Error("failed to insert fixture enquiry");
    enquiryIds.push(enquiry.id);

    await processEnquiryQuoteIssuedJob({ enquiryId: enquiry.id });
    const [original] = await db.query.quotes.findMany({ where: eq(quotes.enquiryId, enquiry.id) });
    if (!original) throw new Error("setup failed — no quote created");

    const revised = await reviseQuote(
      original.id,
      { lineItems: [{ label: "Professional fee", qty: 1, ratePaise: 999900 }], gstRate: 18 },
      makeScope(managerId, "manager"),
    );
    if (!revised) throw new Error("setup failed — revision not created");

    await processQuoteRevisedJob({ quoteId: revised.id });

    const persisted = await db.query.quotes.findFirst({ where: eq(quotes.id, revised.id) });
    expect(persisted?.totalPaise).toBe(revised.totalPaise); // untouched by the notification job
    expect(persisted?.sentAt).not.toBeNull();

    const rows = await db.query.messageLogs.findMany({
      where: eq(messageLogs.entityId, revised.id),
    });
    const whatsappRow = rows.find((r) => r.channel === "whatsapp");
    expect(whatsappRow?.status).toBe("sent");
  }, 15000);

  it("does nothing when the revised quote no longer exists", async () => {
    await expect(processQuoteRevisedJob({ quoteId: randomUUID() })).resolves.toBeUndefined();
  });
});
