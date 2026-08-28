import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { enquiries } from "@/db/schema/enquiries";
import { messageLogs } from "@/db/schema/message-logs";
import { notifications } from "@/db/schema/notifications";
import { processEnquiryAssignedJob } from "@/jobs/enquiry-notifications";

// WHATSAPP_TOKEN is empty in the test .env — irrelevant here since this job only sends email.

describe("enquiry-notifications (integration)", () => {
  const assigneeId = randomUUID();

  beforeAll(async () => {
    await db.insert(user).values({
      id: assigneeId,
      name: "Enquiry Notify Assignee",
      email: `enquiry-notify-assignee-${assigneeId}@test.local`,
      emailVerified: true,
      role: "executive",
    });
  });

  afterAll(async () => {
    await db.delete(notifications).where(eq(notifications.userId, assigneeId));
    await db.delete(user).where(eq(user.id, assigneeId));
  });

  it("emails the assignee and creates a matching in-app notification", async () => {
    const [created] = await db
      .insert(enquiries)
      .values({
        name: "Assigned Fixture",
        phone: `+919876640${randomUUID().slice(0, 6)}`,
        source: "website",
        assignedTo: assigneeId,
      })
      .returning();
    if (!created) throw new Error("failed to create fixture enquiry");

    await processEnquiryAssignedJob({ enquiryId: created.id, assignedTo: assigneeId });

    const emailRow = await db.query.messageLogs.findFirst({
      where: eq(messageLogs.entityId, created.id),
    });
    expect(emailRow?.channel).toBe("email");
    expect(["sent", "failed"]).toContain(emailRow?.status);

    const notificationRow = await db.query.notifications.findFirst({
      where: eq(notifications.entityId, created.id),
    });
    expect(notificationRow?.userId).toBe(assigneeId);
    expect(notificationRow?.type).toBe("enquiry_assigned");
    expect(notificationRow?.href).toBe(`/enquiries/${created.id}`);

    await db.delete(messageLogs).where(eq(messageLogs.entityId, created.id));
    await db.delete(enquiries).where(eq(enquiries.id, created.id));
  });
});
