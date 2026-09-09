import { randomUUID } from "node:crypto";
import { eq, ilike } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { services } from "@/db/schema/catalog";
import { enquiries } from "@/db/schema/enquiries";
import { messageLogs } from "@/db/schema/message-logs";
import { notifications } from "@/db/schema/notifications";
import { quotes } from "@/db/schema/quotes";
import { processQuoteRespondedJob } from "@/jobs/quote-response-notifications";
import { createQuoteForEnquiry, respondToQuote } from "@/services/quotes";

// Email always attempts a real SMTP send here (WHATSAPP_TOKEN isn't involved — this job is email + in-app only).

describe("quote-response-notifications (integration)", () => {
  const enquiryIds: string[] = [];
  const executiveId = randomUUID();
  let serviceId: string;

  beforeAll(async () => {
    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration service not found");
    serviceId = service.id;

    await db.insert(user).values({
      id: executiveId,
      name: "Quote Response Notification Executive",
      email: `quote-response-exec-${executiveId}@test.local`,
      emailVerified: true,
      role: "executive",
    });
  });

  afterAll(async () => {
    for (const id of enquiryIds) {
      const enquiryQuotes = await db.query.quotes.findMany({ where: eq(quotes.enquiryId, id) });
      for (const quote of enquiryQuotes) {
        await db.delete(notifications).where(eq(notifications.entityId, quote.id));
      }
      await db.delete(quotes).where(eq(quotes.enquiryId, id));
    }
    await db.delete(enquiries).where(ilike(enquiries.phone, "+919876643%"));
    await db.delete(user).where(eq(user.id, executiveId));
  });

  async function insertAssignedEnquiryWithQuote() {
    const phone = `+919876643${randomUUID().slice(0, 6)}`;
    const [enquiry] = await db
      .insert(enquiries)
      .values({
        name: "Quote Response Notification Fixture",
        phone,
        serviceInterestedId: serviceId,
        assignedTo: executiveId,
        source: "website",
      })
      .returning();
    if (!enquiry) throw new Error("failed to insert fixture enquiry");
    enquiryIds.push(enquiry.id);

    const quote = await createQuoteForEnquiry(enquiry.id, null);
    if (!quote) throw new Error("failed to create fixture quote");
    return quote;
  }

  it("emails the assigned executive and creates an in-app notification when a client approves", async () => {
    const quote = await insertAssignedEnquiryWithQuote();
    const responded = await respondToQuote(quote.id, { response: "approved" });
    if (!responded) throw new Error("setup failed");

    await processQuoteRespondedJob({ quoteId: responded.id });

    const emailRows = await db.query.messageLogs.findMany({
      where: eq(messageLogs.entityId, responded.id),
    });
    expect(emailRows.some((row) => row.channel === "email")).toBe(true);

    const notificationRows = await db.query.notifications.findMany({
      where: eq(notifications.entityId, responded.id),
    });
    expect(notificationRows).toHaveLength(1);
    expect(notificationRows[0]?.userId).toBe(executiveId);
    expect(notificationRows[0]?.type).toBe("quote_responded");
  }, 15000);

  it("includes the client's note when they request changes", async () => {
    const quote = await insertAssignedEnquiryWithQuote();
    const responded = await respondToQuote(quote.id, {
      response: "negotiating",
      note: "Please revisit the timeline.",
    });
    if (!responded) throw new Error("setup failed");

    await processQuoteRespondedJob({ quoteId: responded.id });

    const notificationRows = await db.query.notifications.findMany({
      where: eq(notifications.entityId, responded.id),
    });
    expect(notificationRows[0]?.body).toBe("Please revisit the timeline.");
  }, 15000);

  it("does nothing when the quote no longer exists", async () => {
    await expect(processQuoteRespondedJob({ quoteId: randomUUID() })).resolves.toBeUndefined();
  });

  it("does nothing when the enquiry has no assignee", async () => {
    const phone = `+919876643${randomUUID().slice(0, 6)}`;
    const [enquiry] = await db
      .insert(enquiries)
      .values({
        name: "Unassigned Quote Response Fixture",
        phone,
        serviceInterestedId: serviceId,
        source: "website",
      })
      .returning();
    if (!enquiry) throw new Error("failed to insert fixture enquiry");
    enquiryIds.push(enquiry.id);

    const quote = await createQuoteForEnquiry(enquiry.id, null);
    if (!quote) throw new Error("failed to create fixture quote");
    const responded = await respondToQuote(quote.id, { response: "approved" });
    if (!responded) throw new Error("setup failed");

    await expect(processQuoteRespondedJob({ quoteId: responded.id })).resolves.toBeUndefined();

    const notificationRows = await db.query.notifications.findMany({
      where: eq(notifications.entityId, responded.id),
    });
    expect(notificationRows).toHaveLength(0);
  });
});
