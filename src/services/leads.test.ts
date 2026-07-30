import { randomUUID } from "node:crypto";
import { addDays, subDays } from "date-fns";
import { eq, ilike, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { clients } from "@/db/schema/clients";
import { leadFollowups, leads } from "@/db/schema/leads";
import { settings } from "@/db/schema/settings";
import {
  addFollowup,
  convertLeadToClient,
  createLead,
  deleteLead,
  getLead,
  getLeadForNotification,
  LEAD_AUTO_ASSIGNMENT_KEY,
  type LeadInput,
  leadInputSchema,
  leadStatusUpdateSchema,
  listFollowUpsDueForExecutive,
  listLeads,
  listLeadsForBoard,
  nextInRoundRobin,
  updateLead,
  updateLeadStatus,
} from "@/services/leads";
import { setSetting } from "@/services/settings";

function input(phone: string, overrides: Partial<LeadInput> = {}): LeadInput {
  return leadInputSchema.parse({
    name: "Scoping Test Lead",
    phone,
    source: "website",
    ...overrides,
  });
}

describe("nextInRoundRobin", () => {
  it("returns the first candidate when nothing was previously assigned", () => {
    expect(nextInRoundRobin(["a", "b", "c"], null)).toBe("a");
  });

  it("advances to the candidate after the last assignee", () => {
    expect(nextInRoundRobin(["a", "b", "c"], "a")).toBe("b");
    expect(nextInRoundRobin(["a", "b", "c"], "b")).toBe("c");
  });

  it("wraps around after the last candidate", () => {
    expect(nextInRoundRobin(["a", "b", "c"], "c")).toBe("a");
  });

  it("restarts from the first candidate if the last assignee is no longer in the list", () => {
    expect(nextInRoundRobin(["a", "b", "c"], "zzz-removed")).toBe("a");
  });

  it("returns undefined when there are no candidates", () => {
    expect(nextInRoundRobin([], null)).toBeUndefined();
  });
});

describe("leads service (integration)", () => {
  const managerId = randomUUID();
  const execAId = randomUUID();
  const execBId = randomUUID();

  const managerScope = { userId: managerId, role: "manager" as const };
  const execAScope = { userId: execAId, role: "executive" as const };
  const execBScope = { userId: execBId, role: "executive" as const };

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: managerId,
        name: "Lead Test Manager",
        email: `lead-manager-${managerId}@test.local`,
        emailVerified: true,
        role: "manager",
      },
      {
        id: execAId,
        name: "Lead Test Exec A",
        email: `lead-execA-${execAId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: execBId,
        name: "Lead Test Exec B",
        email: `lead-execB-${execBId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
    ]);
  });

  afterAll(async () => {
    const testLeads = await db
      .select({ id: leads.id })
      .from(leads)
      .where(ilike(leads.phone, "+919876600%"));
    const testLeadIds = testLeads.map((lead) => lead.id);
    if (testLeadIds.length > 0) {
      await db.delete(leadFollowups).where(inArray(leadFollowups.leadId, testLeadIds));
    }
    await db.delete(leads).where(ilike(leads.phone, "+919876600%"));
    await db.delete(clients).where(ilike(clients.phone, "+919876600%"));
    await db.delete(settings).where(eq(settings.key, LEAD_AUTO_ASSIGNMENT_KEY));
    await db.delete(user).where(eq(user.id, managerId));
    await db.delete(user).where(eq(user.id, execAId));
    await db.delete(user).where(eq(user.id, execBId));
  });

  it("lets an executive see and fetch only leads assigned to them", async () => {
    const leadForA = await createLead(input("9876600001", { assignedTo: execAId }), managerScope);
    const leadForB = await createLead(input("9876600002", { assignedTo: execBId }), managerScope);

    const aList = await listLeads(execAScope);
    expect(aList.rows.map((l) => l.id)).toContain(leadForA.id);
    expect(aList.rows.map((l) => l.id)).not.toContain(leadForB.id);

    const boardList = await listLeadsForBoard(execAScope);
    expect(boardList.map((l) => l.id)).toContain(leadForA.id);
    expect(boardList.map((l) => l.id)).not.toContain(leadForB.id);

    expect(await getLead(leadForB.id, execAScope)).toBeUndefined();
    expect(await getLead(leadForA.id, execAScope)).toBeTruthy();
  });

  it("forces assignedTo to self when an executive creates a lead", async () => {
    const created = await createLead(input("9876600003", { assignedTo: execBId }), execAScope);
    expect(created.assignedTo).toBe(execAId);
  });

  it("leaves a lead unassigned when created without an assignee and auto-assignment is off", async () => {
    await setSetting(LEAD_AUTO_ASSIGNMENT_KEY, false, null);
    const created = await createLead(input("9876600004"), managerScope);
    expect(created.assignedTo).toBeNull();
  });

  it("auto-assigns to a real executive when auto-assignment is on and no assignee was given", async () => {
    await setSetting(LEAD_AUTO_ASSIGNMENT_KEY, true, null);
    const created = await createLead(input("9876600005"), managerScope);

    expect(created.assignedTo).toBeTruthy();
    const assignee = await db.query.user.findFirst({
      where: eq(user.id, created.assignedTo as string),
    });
    expect(assignee?.role).toBe("executive");

    await setSetting(LEAD_AUTO_ASSIGNMENT_KEY, false, null);
  });

  it("respects an explicit assignedTo even when auto-assignment is on", async () => {
    await setSetting(LEAD_AUTO_ASSIGNMENT_KEY, true, null);
    const created = await createLead(input("9876600006", { assignedTo: execBId }), managerScope);
    expect(created.assignedTo).toBe(execBId);
    await setSetting(LEAD_AUTO_ASSIGNMENT_KEY, false, null);
  });

  it("filters by search term, status, and source", async () => {
    const created = await createLead(
      input("9876600016", {
        name: "Very Unique Filter Target",
        source: "referral",
      }),
      managerScope,
    );

    const byName = await listLeads(managerScope, { search: "Very Unique Filter Target" });
    expect(byName.rows.map((l) => l.id)).toContain(created.id);

    const byPhone = await listLeads(managerScope, { search: "9876600016" });
    expect(byPhone.rows.map((l) => l.id)).toContain(created.id);

    const byStatus = await listLeads(managerScope, { status: "new" });
    expect(byStatus.rows.map((l) => l.id)).toContain(created.id);

    const bySource = await listLeads(managerScope, { source: "referral" });
    expect(bySource.rows.map((l) => l.id)).toContain(created.id);

    const noMatch = await listLeads(managerScope, { search: "no-such-lead-xyz" });
    expect(noMatch.rows.map((l) => l.id)).not.toContain(created.id);
  });

  it("lets staff update a lead's details, and blocks an executive from updating one not theirs", async () => {
    const created = await createLead(input("9876600017", { assignedTo: execAId }), managerScope);

    const updated = await updateLead(
      created.id,
      input("9876600017", { name: "Renamed Lead", assignedTo: execAId }),
      managerScope,
    );
    expect(updated?.name).toBe("Renamed Lead");

    const blocked = await updateLead(
      created.id,
      input("9876600017", { name: "Should Not Apply" }),
      execBScope,
    );
    expect(blocked).toBeNull();
  });

  it("rejects a direct status update to won — conversion must go through convertLeadToClient", async () => {
    const created = await createLead(input("9876600007"), managerScope);
    await expect(
      updateLeadStatus(created.id, { status: "won", lostReason: undefined }, managerScope),
    ).rejects.toThrow();
  });

  it("requires a reason when marking a lead lost", () => {
    expect(() => leadStatusUpdateSchema.parse({ status: "lost" })).toThrow();
    expect(() =>
      leadStatusUpdateSchema.parse({ status: "lost", lostReason: "Too expensive" }),
    ).not.toThrow();
  });

  it("stores the lost reason and status together", async () => {
    const created = await createLead(input("9876600008"), managerScope);
    const updated = await updateLeadStatus(
      created.id,
      { status: "lost", lostReason: "Budget too small" },
      managerScope,
    );
    expect(updated?.status).toBe("lost");
    expect(updated?.lostReason).toBe("Budget too small");
  });

  it("prevents an executive from changing the status of a lead not assigned to them", async () => {
    const leadForB = await createLead(input("9876600009", { assignedTo: execBId }), managerScope);
    const result = await updateLeadStatus(
      leadForB.id,
      { status: "contacted", lostReason: undefined },
      execAScope,
    );
    expect(result).toBeNull();
  });

  it("logs a follow-up and updates the lead's next follow-up time", async () => {
    const created = await createLead(input("9876600010", { assignedTo: execAId }), managerScope);
    const nextFollowUpAt = new Date(Date.now() + 86_400_000);

    const followup = await addFollowup(
      created.id,
      { channel: "call", summary: "Discussed pricing", nextFollowUpAt },
      execAScope,
    );
    expect(followup?.summary).toBe("Discussed pricing");

    const refreshed = await getLead(created.id, execAScope);
    expect(refreshed?.nextFollowUpAt?.getTime()).toBe(nextFollowUpAt.getTime());
    expect(refreshed?.followups).toHaveLength(1);
  });

  it("prevents an executive from logging a follow-up on a lead not assigned to them", async () => {
    const leadForA = await createLead(input("9876600015", { assignedTo: execAId }), managerScope);

    const result = await addFollowup(
      leadForA.id,
      { channel: "call", summary: "Should be rejected" },
      execBScope,
    );
    expect(result).toBeNull();
  });

  it("converts a lead into a new client, marks it won, and links the client", async () => {
    const created = await createLead(
      input("9876600011", { assignedTo: execAId, notes: "Wants Pvt Ltd registration" }),
      managerScope,
    );

    const result = await convertLeadToClient(created.id, managerScope);
    expect(result).not.toBeNull();
    expect(result?.lead.status).toBe("won");
    expect(result?.lead.convertedClientId).toBe(result?.client.id);
    expect(result?.client.phone).toBe(created.phone);
  });

  it("links to an existing client with the same phone instead of duplicating it", async () => {
    const phone = input("9876600012").phone;
    const [existingClient] = await db
      .insert(clients)
      .values({ type: "individual", name: "Pre-existing Client", phone, createdBy: managerId })
      .returning();

    const created = await createLead(input("9876600012"), managerScope);
    const result = await convertLeadToClient(created.id, managerScope);

    expect(result?.client.id).toBe(existingClient?.id);
  });

  it("refuses to convert a lead that is already won or lost", async () => {
    const created = await createLead(input("9876600013"), managerScope);
    await convertLeadToClient(created.id, managerScope);

    const secondAttempt = await convertLeadToClient(created.id, managerScope);
    expect(secondAttempt).toBeNull();
  });

  it("soft-deletes a lead so it no longer appears in scoped queries", async () => {
    const created = await createLead(input("9876600014"), managerScope);
    const deleted = await deleteLead(created.id, managerScope);
    expect(deleted?.deletedAt).toBeTruthy();
    expect(await getLead(created.id, managerScope)).toBeUndefined();
  });

  it("getLeadForNotification returns the lead with its assignee's contact info", async () => {
    const created = await createLead(
      input("9876600018", { assignedTo: execAId, name: "Notify Fetch Target" }),
      managerScope,
    );

    const fetched = await getLeadForNotification(created.id);
    expect(fetched?.name).toBe("Notify Fetch Target");
    expect(fetched?.assignee?.id).toBe(execAId);
    expect(fetched?.assignee?.email).toContain("lead-execA-");

    expect(await getLeadForNotification(randomUUID())).toBeUndefined();
  });

  describe("listFollowUpsDueForExecutive (time-frozen)", () => {
    it("includes overdue and due-today follow-ups, excludes future ones and other executives'", async () => {
      const now = new Date("2026-06-15T12:00:00.000Z");

      const overdue = await createLead(
        input("9876600019", { assignedTo: execAId, nextFollowUpAt: subDays(now, 2) }),
        managerScope,
      );
      const dueToday = await createLead(
        input("9876600020", { assignedTo: execAId, nextFollowUpAt: now }),
        managerScope,
      );
      const dueFuture = await createLead(
        input("9876600021", { assignedTo: execAId, nextFollowUpAt: addDays(now, 5) }),
        managerScope,
      );
      const forOtherExec = await createLead(
        input("9876600022", { assignedTo: execBId, nextFollowUpAt: subDays(now, 1) }),
        managerScope,
      );
      const noFollowUp = await createLead(
        input("9876600023", { assignedTo: execAId }),
        managerScope,
      );

      const due = await listFollowUpsDueForExecutive(execAId, now);
      const dueIds = due.map((lead) => lead.id);

      expect(dueIds).toContain(overdue.id);
      expect(dueIds).toContain(dueToday.id);
      expect(dueIds).not.toContain(dueFuture.id);
      expect(dueIds).not.toContain(forOtherExec.id);
      expect(dueIds).not.toContain(noFollowUp.id);
    });
  });
});
