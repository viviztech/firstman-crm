import { randomUUID } from "node:crypto";
import { subDays } from "date-fns";
import { eq, ilike } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { enquiries } from "@/db/schema/enquiries";
import { messageLogs } from "@/db/schema/message-logs";
import { runEnquiryFollowupDigestJob } from "@/jobs/enquiry-digest-cron";
import { makeScope } from "@/lib/test-scope";
import { createEnquiry } from "@/services/enquiries";

describe("runEnquiryFollowupDigestJob (integration, time-frozen)", () => {
  const managerId = randomUUID();
  const execWithDueEnquiryId = randomUUID();
  const execWithFutureEnquiryId = randomUUID();
  const managerScope = makeScope(managerId, "manager");

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: managerId,
        name: "Digest Test Manager",
        email: `digest-manager-${managerId}@test.local`,
        emailVerified: true,
        role: "manager",
      },
      {
        id: execWithDueEnquiryId,
        name: "Digest Test Exec Due",
        email: `digest-exec-due-${execWithDueEnquiryId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: execWithFutureEnquiryId,
        name: "Digest Test Exec Future",
        email: `digest-exec-future-${execWithFutureEnquiryId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(enquiries).where(ilike(enquiries.phone, "+919876612%"));
    await db
      .delete(messageLogs)
      .where(eq(messageLogs.to, `digest-exec-due-${execWithDueEnquiryId}@test.local`));
    await db
      .delete(messageLogs)
      .where(eq(messageLogs.to, `digest-exec-future-${execWithFutureEnquiryId}@test.local`));
    await db.delete(user).where(eq(user.id, managerId));
    await db.delete(user).where(eq(user.id, execWithDueEnquiryId));
    await db.delete(user).where(eq(user.id, execWithFutureEnquiryId));
  });

  it("emails the executive a digest of their overdue/due-today enquiries, and logs it", async () => {
    const now = new Date("2026-06-15T09:00:00.000Z");

    await createEnquiry(
      {
        name: "Digest Enquiry",
        phone: "+919876612001",
        source: "website",
        assignedTo: execWithDueEnquiryId,
        nextFollowUpAt: subDays(now, 1),
      },
      managerScope,
    );

    await runEnquiryFollowupDigestJob(now);

    const rows = await db.query.messageLogs.findMany({
      where: eq(messageLogs.to, `digest-exec-due-${execWithDueEnquiryId}@test.local`),
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((row) => row.template === "enquiry_followup_digest")).toBe(true);
  });

  it("sends nothing for an executive whose only follow-up isn't due yet", async () => {
    const now = new Date("2026-06-15T09:00:00.000Z");

    await createEnquiry(
      {
        name: "Not Due Yet Enquiry",
        phone: "+919876612002",
        source: "website",
        assignedTo: execWithFutureEnquiryId,
        nextFollowUpAt: new Date("2026-08-15T09:00:00.000Z"),
      },
      managerScope,
    );

    await runEnquiryFollowupDigestJob(now);

    const rows = await db.query.messageLogs.findMany({
      where: eq(messageLogs.to, `digest-exec-future-${execWithFutureEnquiryId}@test.local`),
    });
    expect(rows).toHaveLength(0);
  });
});
