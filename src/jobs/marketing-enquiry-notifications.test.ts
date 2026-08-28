import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { enquiries } from "@/db/schema/enquiries";
import { messageLogs } from "@/db/schema/message-logs";

// Exercises the same send+log calls the job handler makes (notifyClientWhatsApp/notifyEmail with
// a freshly re-fetched enquiry), rather than round-tripping through pg-boss's async worker
// dispatch — matching notify.test.ts's approach of testing send+log behavior directly.
// WHATSAPP_TOKEN is empty in the test .env, so WhatsApp sends here exercise the log driver
// deterministically. Email always attempts a real SMTP send.

describe("marketing-enquiry-notifications (integration)", () => {
  const enquiryIds: string[] = [];

  afterAll(async () => {
    for (const id of enquiryIds) {
      await db.delete(messageLogs).where(eq(messageLogs.entityId, id));
      await db.delete(enquiries).where(eq(enquiries.id, id));
    }
  });

  async function insertEnquiry(overrides: { phone: string; email?: string | null }) {
    const [created] = await db
      .insert(enquiries)
      .values({
        name: "Notify Fixture",
        phone: overrides.phone,
        email: overrides.email ?? null,
        source: "website",
      })
      .returning();
    if (!created) throw new Error("failed to insert fixture enquiry");
    enquiryIds.push(created.id);
    return created;
  }

  it("logs both a whatsapp ack and a thank-you email when the enquiry has an email on file", async () => {
    const phone = `+919876620${randomUUID().slice(0, 6)}`;
    const email = `notify-marketing-${randomUUID()}@example.com`;
    const created = await insertEnquiry({ phone, email });

    const { notifyClientWhatsApp, notifyEmail } = await import("@/jobs/notify");
    const { getEnquiryForNotification } = await import("@/services/enquiries");

    await notifyClientWhatsApp({
      phone,
      whatsappOptedOut: false,
      eventKey: "enquiry_received_ack",
      bodyParams: [created.name],
      entityType: "enquiry",
      entityId: created.id,
    });
    const fetched = await getEnquiryForNotification(created.id);
    await notifyEmail({
      to: fetched?.email,
      subject: "Thanks for reaching out to FirstMan Corporate Services",
      heading: "We've received your enquiry",
      lines: ["line"],
      template: "enquiry_received_ack",
      entityType: "enquiry",
      entityId: created.id,
    });

    const rows = await db.query.messageLogs.findMany({
      where: eq(messageLogs.entityId, created.id),
    });
    const whatsappRow = rows.find((r) => r.channel === "whatsapp");
    const emailRow = rows.find((r) => r.channel === "email");
    expect(whatsappRow?.status).toBe("sent");
    expect(emailRow?.to).toBe(email);
    expect(["sent", "failed"]).toContain(emailRow?.status);
  });

  it("skips the email log entirely when the enquiry has no email on file", async () => {
    const phone = `+919876621${randomUUID().slice(0, 6)}`;
    const created = await insertEnquiry({ phone, email: null });

    const { notifyEmail } = await import("@/jobs/notify");
    const { getEnquiryForNotification } = await import("@/services/enquiries");

    const fetched = await getEnquiryForNotification(created.id);
    expect(fetched?.email).toBeNull();

    await notifyEmail({
      to: fetched?.email,
      subject: "Thanks for reaching out to FirstMan Corporate Services",
      heading: "We've received your enquiry",
      lines: ["line"],
      template: "enquiry_received_ack",
      entityType: "enquiry",
      entityId: created.id,
    });

    const rows = await db.query.messageLogs.findMany({
      where: eq(messageLogs.entityId, created.id),
    });
    expect(rows.find((r) => r.channel === "email")).toBeUndefined();
  });
});
