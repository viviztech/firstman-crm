import { randomUUID } from "node:crypto";
import { addDays, subDays } from "date-fns";
import { eq, ilike, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { services } from "@/db/schema/catalog";
import { clients } from "@/db/schema/clients";
import { enquiries, enquiryFollowups } from "@/db/schema/enquiries";
import { invoices, payments } from "@/db/schema/invoices";
import { orders } from "@/db/schema/orders";
import { settings } from "@/db/schema/settings";
import { makeScope } from "@/lib/test-scope";
import {
  addFollowup,
  closeEnquiryAsSale,
  createEnquiry,
  deleteEnquiry,
  ENQUIRY_AUTO_ASSIGNMENT_KEY,
  type EnquiryInput,
  enquiryInputSchema,
  enquiryStatusUpdateSchema,
  getEnquiry,
  getEnquiryForNotification,
  hardDeleteEnquiry,
  listEnquiries,
  listEnquiriesForBoard,
  listFollowUpsDueForExecutive,
  listLostEnquiries,
  nextInRoundRobin,
  updateEnquiry,
  updateEnquiryStatus,
} from "@/services/enquiries";
import { setSetting } from "@/services/settings";
import {
  setStaffPincodes,
  setStaffServiceAssignments,
  updateStaffEmployeeType,
} from "@/services/staff";

function input(phone: string, overrides: Partial<EnquiryInput> = {}): EnquiryInput {
  return enquiryInputSchema.parse({
    name: "Scoping Test Enquiry",
    phone,
    source: "website",
    ...overrides,
  });
}

async function cleanupTestData(phonePattern: string): Promise<void> {
  const testEnquiries = await db
    .select({ id: enquiries.id })
    .from(enquiries)
    .where(ilike(enquiries.phone, phonePattern));
  const testEnquiryIds = testEnquiries.map((e) => e.id);
  if (testEnquiryIds.length > 0) {
    await db.delete(enquiryFollowups).where(inArray(enquiryFollowups.enquiryId, testEnquiryIds));
  }
  await db.delete(enquiries).where(ilike(enquiries.phone, phonePattern));

  const testClients = await db
    .select({ id: clients.id })
    .from(clients)
    .where(ilike(clients.phone, phonePattern));
  const testClientIds = testClients.map((c) => c.id);
  if (testClientIds.length > 0) {
    const testInvoices = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(inArray(invoices.clientId, testClientIds));
    const testInvoiceIds = testInvoices.map((i) => i.id);
    if (testInvoiceIds.length > 0) {
      await db.delete(payments).where(inArray(payments.invoiceId, testInvoiceIds));
    }
    await db.delete(invoices).where(inArray(invoices.clientId, testClientIds));
    await db.delete(orders).where(inArray(orders.clientId, testClientIds));
  }
  await db.delete(clients).where(ilike(clients.phone, phonePattern));
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

describe("enquiries service (integration)", () => {
  const managerId = randomUUID();
  const execAId = randomUUID();
  const execBId = randomUUID();

  const managerScope = makeScope(managerId, "manager");
  const execAScope = makeScope(execAId, "executive");
  const execBScope = makeScope(execBId, "executive");

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: managerId,
        name: "Enquiry Test Manager",
        email: `enquiry-manager-${managerId}@test.local`,
        emailVerified: true,
        role: "manager",
      },
      {
        id: execAId,
        name: "Enquiry Test Exec A",
        email: `enquiry-execA-${execAId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: execBId,
        name: "Enquiry Test Exec B",
        email: `enquiry-execB-${execBId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
    ]);
  });

  afterAll(async () => {
    await cleanupTestData("+919876600%");
    await db.delete(settings).where(eq(settings.key, ENQUIRY_AUTO_ASSIGNMENT_KEY));
    await db.delete(user).where(eq(user.id, managerId));
    await db.delete(user).where(eq(user.id, execAId));
    await db.delete(user).where(eq(user.id, execBId));
  });

  it("lets an executive see and fetch only enquiries assigned to them", async () => {
    const enquiryForA = await createEnquiry(
      input("9876600001", { assignedTo: execAId }),
      managerScope,
    );
    const enquiryForB = await createEnquiry(
      input("9876600002", { assignedTo: execBId }),
      managerScope,
    );

    const aList = await listEnquiries(execAScope);
    expect(aList.rows.map((e) => e.id)).toContain(enquiryForA.id);
    expect(aList.rows.map((e) => e.id)).not.toContain(enquiryForB.id);

    const boardList = await listEnquiriesForBoard(execAScope);
    expect(boardList.map((e) => e.id)).toContain(enquiryForA.id);
    expect(boardList.map((e) => e.id)).not.toContain(enquiryForB.id);

    expect(await getEnquiry(enquiryForB.id, execAScope)).toBeUndefined();
    expect(await getEnquiry(enquiryForA.id, execAScope)).toBeTruthy();
  });

  it("forces assignedTo to self when an executive creates an enquiry", async () => {
    const created = await createEnquiry(input("9876600003", { assignedTo: execBId }), execAScope);
    expect(created.assignedTo).toBe(execAId);
  });

  it("leaves an enquiry unassigned when created without an assignee and auto-assignment is off", async () => {
    await setSetting(ENQUIRY_AUTO_ASSIGNMENT_KEY, false, null);
    const created = await createEnquiry(input("9876600004"), managerScope);
    expect(created.assignedTo).toBeNull();
  });

  it("auto-assigns to a real executive when auto-assignment is on and no assignee was given", async () => {
    await setSetting(ENQUIRY_AUTO_ASSIGNMENT_KEY, true, null);
    const created = await createEnquiry(input("9876600005"), managerScope);

    expect(created.assignedTo).toBeTruthy();
    const assignee = await db.query.user.findFirst({
      where: eq(user.id, created.assignedTo as string),
    });
    expect(assignee?.role).toBe("executive");

    await setSetting(ENQUIRY_AUTO_ASSIGNMENT_KEY, false, null);
  });

  it("respects an explicit assignedTo even when auto-assignment is on", async () => {
    await setSetting(ENQUIRY_AUTO_ASSIGNMENT_KEY, true, null);
    const created = await createEnquiry(input("9876600006", { assignedTo: execBId }), managerScope);
    expect(created.assignedTo).toBe(execBId);
    await setSetting(ENQUIRY_AUTO_ASSIGNMENT_KEY, false, null);
  });

  it("filters by search term, status, and source", async () => {
    const created = await createEnquiry(
      input("9876600016", {
        name: "Very Unique Filter Target",
        source: "referral",
      }),
      managerScope,
    );

    const byName = await listEnquiries(managerScope, { search: "Very Unique Filter Target" });
    expect(byName.rows.map((e) => e.id)).toContain(created.id);

    const byPhone = await listEnquiries(managerScope, { search: "9876600016" });
    expect(byPhone.rows.map((e) => e.id)).toContain(created.id);

    const byStatus = await listEnquiries(managerScope, { status: "new" });
    expect(byStatus.rows.map((e) => e.id)).toContain(created.id);

    const bySource = await listEnquiries(managerScope, { source: "referral" });
    expect(bySource.rows.map((e) => e.id)).toContain(created.id);

    const noMatch = await listEnquiries(managerScope, { search: "no-such-enquiry-xyz" });
    expect(noMatch.rows.map((e) => e.id)).not.toContain(created.id);
  });

  it("lets staff update an enquiry's details, and blocks an executive from updating one not theirs", async () => {
    const created = await createEnquiry(input("9876600017", { assignedTo: execAId }), managerScope);

    const updated = await updateEnquiry(
      created.id,
      input("9876600017", { name: "Renamed Enquiry", assignedTo: execAId }),
      managerScope,
    );
    expect(updated?.name).toBe("Renamed Enquiry");

    const blocked = await updateEnquiry(
      created.id,
      input("9876600017", { name: "Should Not Apply" }),
      execBScope,
    );
    expect(blocked).toBeNull();
  });

  it("rejects a direct status update to won — conversion must go through closeEnquiryAsSale", async () => {
    const created = await createEnquiry(input("9876600007"), managerScope);
    await expect(
      updateEnquiryStatus(created.id, { status: "won", lostReason: undefined }, managerScope),
    ).rejects.toThrow();
  });

  it("requires a reason when marking an enquiry lost", () => {
    expect(() => enquiryStatusUpdateSchema.parse({ status: "lost" })).toThrow();
    expect(() =>
      enquiryStatusUpdateSchema.parse({ status: "lost", lostReason: "Too expensive" }),
    ).not.toThrow();
  });

  it("stores the lost reason and status together, and hides the enquiry from every scoped query", async () => {
    const created = await createEnquiry(input("9876600008"), managerScope);
    const updated = await updateEnquiryStatus(
      created.id,
      { status: "lost", lostReason: "Budget too small" },
      managerScope,
    );
    expect(updated?.status).toBe("lost");
    expect(updated?.lostReason).toBe("Budget too small");

    expect(await getEnquiry(created.id, managerScope)).toBeUndefined();
    const list = await listEnquiries(managerScope, { search: created.phone });
    expect(list.rows.map((e) => e.id)).not.toContain(created.id);
    const board = await listEnquiriesForBoard(managerScope);
    expect(board.map((e) => e.id)).not.toContain(created.id);

    const lost = await listLostEnquiries();
    expect(lost.map((e) => e.id)).toContain(created.id);
  });

  it("prevents an executive from changing the status of an enquiry not assigned to them", async () => {
    const enquiryForB = await createEnquiry(
      input("9876600009", { assignedTo: execBId }),
      managerScope,
    );
    const result = await updateEnquiryStatus(
      enquiryForB.id,
      { status: "contacted", lostReason: undefined },
      execAScope,
    );
    expect(result).toBeNull();
  });

  it("logs a self follow-up, updates next follow-up time, and leaves ownership unchanged", async () => {
    const created = await createEnquiry(input("9876600010", { assignedTo: execAId }), managerScope);
    const nextFollowUpAt = new Date(Date.now() + 86_400_000);

    const followup = await addFollowup(
      created.id,
      { channel: "call", summary: "Discussed pricing", nextFollowUpAt, handoffType: "self" },
      execAScope,
    );
    expect(followup?.summary).toBe("Discussed pricing");
    expect(followup?.handoffType).toBe("self");

    const refreshed = await getEnquiry(created.id, execAScope);
    expect(refreshed?.nextFollowUpAt?.getTime()).toBe(nextFollowUpAt.getTime());
    expect(refreshed?.assignedTo).toBe(execAId);
    expect(refreshed?.nextFollowUpAssignedTo).toBeNull();
    expect(refreshed?.followups).toHaveLength(1);
  });

  it("hands off a one-time follow-up without changing the enquiry's permanent owner", async () => {
    const created = await createEnquiry(input("9876600024", { assignedTo: execAId }), managerScope);

    const followup = await addFollowup(
      created.id,
      {
        channel: "call",
        summary: "Handing this one off",
        handoffType: "one_time",
        handoffTo: execBId,
      },
      execAScope,
    );
    expect(followup?.handoffType).toBe("one_time");
    expect(followup?.handoffTo).toBe(execBId);

    const refreshed = await getEnquiry(created.id, managerScope);
    expect(refreshed?.assignedTo).toBe(execAId);
    expect(refreshed?.nextFollowUpAssignedTo).toBe(execBId);
  });

  it("permanently transfers ownership on a permanent handoff and clears the one-time cursor", async () => {
    const created = await createEnquiry(input("9876600025", { assignedTo: execAId }), managerScope);

    await addFollowup(
      created.id,
      {
        channel: "call",
        summary: "Permanent transfer",
        handoffType: "permanent",
        handoffTo: execBId,
      },
      execAScope,
    );

    const refreshed = await getEnquiry(created.id, managerScope);
    expect(refreshed?.assignedTo).toBe(execBId);
    expect(refreshed?.nextFollowUpAssignedTo).toBeNull();
  });

  it("prevents an executive from logging a follow-up on an enquiry not assigned to them", async () => {
    const enquiryForA = await createEnquiry(
      input("9876600015", { assignedTo: execAId }),
      managerScope,
    );

    const result = await addFollowup(
      enquiryForA.id,
      { channel: "call", summary: "Should be rejected", handoffType: "self" },
      execBScope,
    );
    expect(result).toBeNull();
  });

  it("closes a sale: converts the enquiry into a new client, creates an order, and marks it won", async () => {
    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration not found");

    const created = await createEnquiry(
      input("9876600011", { assignedTo: execAId, notes: "Wants Pvt Ltd registration" }),
      managerScope,
    );

    const result = await closeEnquiryAsSale(
      created.id,
      {
        name: created.name,
        phone: created.phone,
        email: undefined,
        address: "12 MG Road",
        pincode: "560001",
        serviceId: service.id,
        quotedPricePaise: service.basePricePaise,
        govtFeePaise: service.govtFeePaise ?? undefined,
        comments: "Closed on first call",
      },
      managerScope,
    );

    expect(result).not.toBeNull();
    expect(result?.enquiry.status).toBe("won");
    expect(result?.enquiry.convertedClientId).toBe(result?.client.id);
    expect(result?.enquiry.convertedOrderId).toBe(result?.order.id);
    expect(result?.client.phone).toBe(created.phone);
    expect(result?.client.address).toBe("12 MG Road");
    expect(result?.order.clientId).toBe(result?.client.id);
    expect(result?.order.serviceId).toBe(service.id);
    expect(result?.order.quotedPricePaise).toBe(service.basePricePaise);

    // Closing a sale also issues the job's proforma invoice — advance-payment request, not a
    // fiscal document — atomically alongside the client and order.
    expect(result?.proformaInvoice.kind).toBe("proforma");
    expect(result?.proformaInvoice.status).toBe("sent");
    expect(result?.proformaInvoice.orderId).toBe(result?.order.id);
    expect(result?.proformaInvoice.clientId).toBe(result?.client.id);
    expect(result?.proformaInvoice.totalPaise).toBeGreaterThan(0);
  });

  it("links to an existing client with the same phone instead of duplicating it", async () => {
    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration not found");

    const phone = input("9876600012").phone;
    const [existingClient] = await db
      .insert(clients)
      .values({ type: "individual", name: "Pre-existing Client", phone, createdBy: managerId })
      .returning();

    const created = await createEnquiry(input("9876600012"), managerScope);
    const result = await closeEnquiryAsSale(
      created.id,
      {
        name: created.name,
        phone: created.phone,
        email: undefined,
        address: undefined,
        pincode: undefined,
        serviceId: service.id,
        quotedPricePaise: service.basePricePaise,
        govtFeePaise: undefined,
        comments: undefined,
      },
      managerScope,
    );

    expect(result?.client.id).toBe(existingClient?.id);
  });

  it("refuses to close a sale on an enquiry that is already won or lost", async () => {
    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration not found");

    const created = await createEnquiry(input("9876600013"), managerScope);
    const saleInput = {
      name: created.name,
      phone: created.phone,
      email: undefined,
      address: undefined,
      pincode: undefined,
      serviceId: service.id,
      quotedPricePaise: service.basePricePaise,
      govtFeePaise: undefined,
      comments: undefined,
    };
    await closeEnquiryAsSale(created.id, saleInput, managerScope);

    const secondAttempt = await closeEnquiryAsSale(created.id, saleInput, managerScope);
    expect(secondAttempt).toBeNull();
  });

  it("soft-deletes an enquiry so it no longer appears in scoped queries", async () => {
    const created = await createEnquiry(input("9876600014"), managerScope);
    const deleted = await deleteEnquiry(created.id, managerScope);
    expect(deleted?.deletedAt).toBeTruthy();
    expect(await getEnquiry(created.id, managerScope)).toBeUndefined();
  });

  it("getEnquiryForNotification returns the enquiry with its assignee's contact info", async () => {
    const created = await createEnquiry(
      input("9876600018", { assignedTo: execAId, name: "Notify Fetch Target" }),
      managerScope,
    );

    const fetched = await getEnquiryForNotification(created.id);
    expect(fetched?.name).toBe("Notify Fetch Target");
    expect(fetched?.assignee?.id).toBe(execAId);
    expect(fetched?.assignee?.email).toContain("enquiry-execA-");

    expect(await getEnquiryForNotification(randomUUID())).toBeUndefined();
  });

  it("hardDeleteEnquiry rejects non-super_admin actors and permanently removes the row (cascading follow-ups) for super_admin", async () => {
    const created = await createEnquiry(input("9876600026"), managerScope);
    await addFollowup(
      created.id,
      { channel: "call", summary: "Before purge", handoffType: "self" },
      managerScope,
    );

    await expect(hardDeleteEnquiry(created.id, managerScope)).rejects.toThrow();

    const superAdminScope = makeScope(managerId, "super_admin");
    const deleted = await hardDeleteEnquiry(created.id, superAdminScope);
    expect(deleted?.id).toBe(created.id);

    const followupsLeft = await db.query.enquiryFollowups.findMany({
      where: eq(enquiryFollowups.enquiryId, created.id),
    });
    expect(followupsLeft).toHaveLength(0);
  });

  describe("listFollowUpsDueForExecutive (time-frozen)", () => {
    it("includes overdue and due-today follow-ups, excludes future ones and other executives'", async () => {
      const now = new Date("2026-06-15T12:00:00.000Z");

      const overdue = await createEnquiry(
        input("9876600019", { assignedTo: execAId, nextFollowUpAt: subDays(now, 2) }),
        managerScope,
      );
      const dueToday = await createEnquiry(
        input("9876600020", { assignedTo: execAId, nextFollowUpAt: now }),
        managerScope,
      );
      const dueFuture = await createEnquiry(
        input("9876600021", { assignedTo: execAId, nextFollowUpAt: addDays(now, 5) }),
        managerScope,
      );
      const forOtherExec = await createEnquiry(
        input("9876600022", { assignedTo: execBId, nextFollowUpAt: subDays(now, 1) }),
        managerScope,
      );
      const noFollowUp = await createEnquiry(
        input("9876600023", { assignedTo: execAId }),
        managerScope,
      );

      const due = await listFollowUpsDueForExecutive(execAId, now);
      const dueIds = due.map((enquiry) => enquiry.id);

      expect(dueIds).toContain(overdue.id);
      expect(dueIds).toContain(dueToday.id);
      expect(dueIds).not.toContain(dueFuture.id);
      expect(dueIds).not.toContain(forOtherExec.id);
      expect(dueIds).not.toContain(noFollowUp.id);
    });

    it("routes the digest to a one-time handoff target instead of the permanent owner", async () => {
      const now = new Date("2026-06-15T12:00:00.000Z");

      const created = await createEnquiry(
        input("9876600027", { assignedTo: execAId }),
        managerScope,
      );
      await addFollowup(
        created.id,
        {
          channel: "call",
          summary: "One-time handoff for digest test",
          nextFollowUpAt: subDays(now, 1),
          handoffType: "one_time",
          handoffTo: execBId,
        },
        execAScope,
      );

      const dueForB = await listFollowUpsDueForExecutive(execBId, now);
      expect(dueForB.map((e) => e.id)).toContain(created.id);

      const dueForA = await listFollowUpsDueForExecutive(execAId, now);
      expect(dueForA.map((e) => e.id)).not.toContain(created.id);
    });
  });
});

describe("franchise territory scoping and pool-aware round robin (ADR 0001, integration)", () => {
  const managerId = randomUUID();
  const internalExecId = randomUUID();
  const franchiseExecId = randomUUID();
  const franchiseExecId2 = randomUUID();
  const managerScope = makeScope(managerId, "manager");
  const PINCODE = "560099";
  const OTHER_PINCODE = "110099";
  // A second pincode covered by both franchise execs, isolated from PINCODE, so the
  // service-narrowing test's pool is exactly {franchiseExecId, franchiseExecId2} — never
  // polluted by other executives elsewhere in the database (unlike the shared internal pool).
  const PAIR_PINCODE = "560098";

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: managerId,
        name: "Territory Test Manager",
        email: `territory-manager-${managerId}@test.local`,
        emailVerified: true,
        role: "manager",
      },
      {
        id: internalExecId,
        name: "Territory Test Internal Exec",
        email: `territory-internal-${internalExecId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: franchiseExecId,
        name: "Territory Test Franchise Exec",
        email: `territory-franchise-${franchiseExecId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: franchiseExecId2,
        name: "Territory Test Franchise Exec 2",
        email: `territory-franchise2-${franchiseExecId2}@test.local`,
        emailVerified: true,
        role: "executive",
      },
    ]);
    await updateStaffEmployeeType(franchiseExecId, "franchise", managerScope);
    await setStaffPincodes(franchiseExecId, [PINCODE, PAIR_PINCODE], managerScope);
    await updateStaffEmployeeType(franchiseExecId2, "franchise", managerScope);
    await setStaffPincodes(franchiseExecId2, [PAIR_PINCODE], managerScope);
  });

  afterAll(async () => {
    await db.delete(enquiries).where(ilike(enquiries.phone, "+919876601%"));
    await db.delete(settings).where(eq(settings.key, ENQUIRY_AUTO_ASSIGNMENT_KEY));
    await db.delete(user).where(eq(user.id, managerId));
    await db.delete(user).where(eq(user.id, internalExecId));
    await db.delete(user).where(eq(user.id, franchiseExecId));
    await db.delete(user).where(eq(user.id, franchiseExecId2));
  });

  it("scopes a franchise executive's visibility to their allocated pincode territory, not assignedTo", async () => {
    const inTerritory = await createEnquiry(
      input("9876601001", { pincode: PINCODE, assignedTo: internalExecId }),
      managerScope,
    );
    const outOfTerritory = await createEnquiry(
      input("9876601002", { pincode: OTHER_PINCODE }),
      managerScope,
    );

    const franchiseScope = makeScope(franchiseExecId, "executive", {
      employeeType: "franchise",
      pincodes: [PINCODE],
    });
    const visible = await listEnquiries(franchiseScope);
    const visibleIds = visible.rows.map((e) => e.id);
    expect(visibleIds).toContain(inTerritory.id);
    expect(visibleIds).not.toContain(outOfTerritory.id);
  });

  it("auto-assigns a pincode-matched enquiry to the covering franchise instead of the internal pool", async () => {
    await setSetting(ENQUIRY_AUTO_ASSIGNMENT_KEY, true, null);
    const created = await createEnquiry(input("9876601003", { pincode: PINCODE }), managerScope);
    expect(created.assignedTo).toBe(franchiseExecId);
    await setSetting(ENQUIRY_AUTO_ASSIGNMENT_KEY, false, null);
  });

  it("falls back to the internal pool when no franchise covers the enquiry's pincode", async () => {
    await setSetting(ENQUIRY_AUTO_ASSIGNMENT_KEY, true, null);
    const created = await createEnquiry(input("9876601004", { pincode: "999999" }), managerScope);
    expect(created.assignedTo).not.toBe(franchiseExecId);
    await setSetting(ENQUIRY_AUTO_ASSIGNMENT_KEY, false, null);
  });

  it("excludes a franchise peer assigned to a different service, keeping the unrestricted one eligible", async () => {
    const [targetService, otherService] = await Promise.all([
      db.query.services.findFirst({ where: eq(services.slug, "pvt-ltd-registration") }),
      db.query.services.findFirst({ where: eq(services.slug, "gst-registration") }),
    ]);
    if (!targetService || !otherService) {
      throw new Error("Seed catalog first — pvt-ltd-registration/gst-registration not found");
    }

    // franchiseExecId is explicitly assigned to a *different* service — excluded from this
    // pool. franchiseExecId2 has no assignment rows at all — stays eligible (unrestricted).
    await setStaffServiceAssignments(franchiseExecId, [otherService.id], managerScope);
    await setSetting(ENQUIRY_AUTO_ASSIGNMENT_KEY, true, null);

    const created = await createEnquiry(
      input("9876601005", { pincode: PAIR_PINCODE, serviceInterestedId: targetService.id }),
      managerScope,
    );
    expect(created.assignedTo).toBe(franchiseExecId2);

    await setSetting(ENQUIRY_AUTO_ASSIGNMENT_KEY, false, null);
    await setStaffServiceAssignments(franchiseExecId, [], managerScope);
  });
});
