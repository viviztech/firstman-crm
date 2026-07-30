import { randomUUID } from "node:crypto";
import { subDays } from "date-fns";
import { eq, ilike } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { leads } from "@/db/schema/leads";
import { messageLogs } from "@/db/schema/message-logs";
import { runLeadFollowupDigestJob } from "@/jobs/lead-digest-cron";
import { createLead } from "@/services/leads";

describe("runLeadFollowupDigestJob (integration, time-frozen)", () => {
  const managerId = randomUUID();
  const execWithDueLeadId = randomUUID();
  const execWithFutureLeadId = randomUUID();
  const managerScope = { userId: managerId, role: "manager" as const };

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
        id: execWithDueLeadId,
        name: "Digest Test Exec Due",
        email: `digest-exec-due-${execWithDueLeadId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: execWithFutureLeadId,
        name: "Digest Test Exec Future",
        email: `digest-exec-future-${execWithFutureLeadId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(leads).where(ilike(leads.phone, "+919876612%"));
    await db
      .delete(messageLogs)
      .where(eq(messageLogs.to, `digest-exec-due-${execWithDueLeadId}@test.local`));
    await db
      .delete(messageLogs)
      .where(eq(messageLogs.to, `digest-exec-future-${execWithFutureLeadId}@test.local`));
    await db.delete(user).where(eq(user.id, managerId));
    await db.delete(user).where(eq(user.id, execWithDueLeadId));
    await db.delete(user).where(eq(user.id, execWithFutureLeadId));
  });

  it("emails the executive a digest of their overdue/due-today leads, and logs it", async () => {
    const now = new Date("2026-06-15T09:00:00.000Z");

    await createLead(
      {
        name: "Digest Lead",
        phone: "+919876612001",
        source: "website",
        assignedTo: execWithDueLeadId,
        nextFollowUpAt: subDays(now, 1),
      },
      managerScope,
    );

    await runLeadFollowupDigestJob(now);

    const rows = await db.query.messageLogs.findMany({
      where: eq(messageLogs.to, `digest-exec-due-${execWithDueLeadId}@test.local`),
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((row) => row.template === "lead_followup_digest")).toBe(true);
  });

  it("sends nothing for an executive whose only follow-up isn't due yet", async () => {
    const now = new Date("2026-06-15T09:00:00.000Z");

    await createLead(
      {
        name: "Not Due Yet Lead",
        phone: "+919876612002",
        source: "website",
        assignedTo: execWithFutureLeadId,
        nextFollowUpAt: new Date("2026-08-15T09:00:00.000Z"),
      },
      managerScope,
    );

    await runLeadFollowupDigestJob(now);

    const rows = await db.query.messageLogs.findMany({
      where: eq(messageLogs.to, `digest-exec-future-${execWithFutureLeadId}@test.local`),
    });
    expect(rows).toHaveLength(0);
  });
});
