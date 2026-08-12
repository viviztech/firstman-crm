import { randomUUID } from "node:crypto";
import { addDays, subDays } from "date-fns";
import { and, eq, ilike, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { activityLogs } from "@/db/schema/activity-logs";
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
  claimEnquiry,
  closeEnquiryAsSale,
  createEnquiry,
  deleteEnquiry,
  ENQUIRY_AUTO_ASSIGNMENT_KEY,
  type EnquiryInput,
  enquiryInputSchema,
  enquiryStatusUpdateSchema,
  getEnquiry,
  getEnquiryForNotification,
  getMySalesDashboardStats,
  hardDeleteEnquiry,
  listEnquiries,
  listEnquiriesForBoard,
  listFollowUpsDueForExecutive,
  listLostEnquiries,
  listMyActiveEnquiries,
  listMyFollowUpsSplit,
  listMyLostEnquiriesForExecutive,
  listMyWonEnquiries,
  listOpenEnquiries,
  nextInRoundRobin,
  updateEnquiry,
  updateEnquiryStatus,
} from "@/services/enquiries";
import { setSetting } from "@/services/settings";
import {
  setStaffPincodes,
  setStaffServiceAssignments,
  updateStaffEmployeeType,
  updateStaffTeam,
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
        services: [
          {
            serviceId: service.id,
            quotedPricePaise: service.basePricePaise,
            govtFeePaise: service.govtFeePaise ?? undefined,
          },
        ],
        comments: "Closed on first call",
      },
      managerScope,
    );

    expect(result).not.toBeNull();
    expect(result?.enquiry.status).toBe("won");
    expect(result?.enquiry.convertedClientId).toBe(result?.client.id);
    expect(result?.enquiry.convertedOrderId).toBe(result?.orders[0]?.id);
    expect(result?.client.phone).toBe(created.phone);
    expect(result?.client.address).toBe("12 MG Road");
    expect(result?.orders[0]?.clientId).toBe(result?.client.id);
    expect(result?.orders[0]?.serviceId).toBe(service.id);
    expect(result?.orders[0]?.quotedPricePaise).toBe(service.basePricePaise);

    // Closing a sale also issues the job's proforma invoice — advance-payment request, not a
    // fiscal document — atomically alongside the client and order.
    expect(result?.proformaInvoices[0]?.kind).toBe("proforma");
    expect(result?.proformaInvoices[0]?.status).toBe("sent");
    expect(result?.proformaInvoices[0]?.orderId).toBe(result?.orders[0]?.id);
    expect(result?.proformaInvoices[0]?.clientId).toBe(result?.client.id);
    expect(result?.proformaInvoices[0]?.totalPaise).toBeGreaterThan(0);
  });

  it("closes a sale: the Sales screen's own city overrides the enquiry's original city", async () => {
    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration not found");

    const created = await createEnquiry(
      input("9876600060", { assignedTo: execAId, city: "Chennai" }),
      managerScope,
    );

    const result = await closeEnquiryAsSale(
      created.id,
      {
        name: created.name,
        phone: created.phone,
        email: undefined,
        address: "12 MG Road",
        city: "Coimbatore",
        pincode: "641001",
        services: [{ serviceId: service.id, quotedPricePaise: service.basePricePaise }],
        comments: "Corrected city at time of sale",
      },
      managerScope,
    );

    expect(result?.client.city).toBe("Coimbatore");
  });

  it("closes a sale: falls back to the enquiry's own city when the Sales screen doesn't supply one", async () => {
    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration not found");

    const created = await createEnquiry(
      input("9876600061", { assignedTo: execAId, city: "Chennai" }),
      managerScope,
    );

    const result = await closeEnquiryAsSale(
      created.id,
      {
        name: created.name,
        phone: created.phone,
        email: undefined,
        address: "12 MG Road",
        pincode: "600001",
        services: [{ serviceId: service.id, quotedPricePaise: service.basePricePaise }],
        comments: "No city correction",
      },
      managerScope,
    );

    expect(result?.client.city).toBe("Chennai");
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
        services: [
          {
            serviceId: service.id,
            quotedPricePaise: service.basePricePaise,
            govtFeePaise: undefined,
          },
        ],
        comments: undefined,
      },
      managerScope,
    );

    expect(result?.client.id).toBe(existingClient?.id);
  });

  it("gives a brand-new client a Customer Identification Number in the FM<year><6-digit> format", async () => {
    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration not found");

    const created = await createEnquiry(input("9876600040"), managerScope);
    const result = await closeEnquiryAsSale(
      created.id,
      {
        name: created.name,
        phone: created.phone,
        email: undefined,
        address: undefined,
        pincode: undefined,
        services: [
          {
            serviceId: service.id,
            quotedPricePaise: service.basePricePaise,
            govtFeePaise: undefined,
          },
        ],
        comments: undefined,
      },
      managerScope,
    );

    expect(result?.client.cin).toMatch(/^FM\d{4}\d{6}$/);
  });

  it("links to an existing client with the same email when the phone is new", async () => {
    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration not found");

    const [existingClient] = await db
      .insert(clients)
      .values({
        type: "individual",
        name: "Existing Email Client",
        phone: "+919876600041",
        email: "dedup-by-email@example.com",
        createdBy: managerId,
      })
      .returning();

    const created = await createEnquiry(input("9876600042"), managerScope);
    const result = await closeEnquiryAsSale(
      created.id,
      {
        name: created.name,
        phone: created.phone,
        email: "dedup-by-email@example.com",
        address: undefined,
        pincode: undefined,
        services: [
          {
            serviceId: service.id,
            quotedPricePaise: service.basePricePaise,
            govtFeePaise: undefined,
          },
        ],
        comments: undefined,
      },
      managerScope,
    );

    expect(result?.client.id).toBe(existingClient?.id);
  });

  it("resolves a phone/email dedup conflict in favor of phone, and logs it for review", async () => {
    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration not found");

    const [clientByPhone] = await db
      .insert(clients)
      .values({
        type: "individual",
        name: "Conflict Phone Client",
        phone: "+919876600043",
        createdBy: managerId,
      })
      .returning();
    const [clientByEmail] = await db
      .insert(clients)
      .values({
        type: "individual",
        name: "Conflict Email Client",
        phone: "+919876600098",
        email: "conflict@example.com",
        createdBy: managerId,
      })
      .returning();
    if (!clientByPhone || !clientByEmail) throw new Error("Failed to set up conflict clients");

    const created = await createEnquiry(input("9876600043"), managerScope);
    const result = await closeEnquiryAsSale(
      created.id,
      {
        name: created.name,
        phone: created.phone,
        email: "conflict@example.com",
        address: undefined,
        pincode: undefined,
        services: [
          {
            serviceId: service.id,
            quotedPricePaise: service.basePricePaise,
            govtFeePaise: undefined,
          },
        ],
        comments: undefined,
      },
      managerScope,
    );

    expect(result?.client.id).toBe(clientByPhone.id);

    const conflictLogs = await db.query.activityLogs.findMany({
      where: and(
        eq(activityLogs.entityType, "client"),
        eq(activityLogs.entityId, clientByPhone.id),
        eq(activityLogs.action, "dedup_conflict_phone_precedence"),
      ),
    });
    expect(conflictLogs.length).toBeGreaterThan(0);

    const untouchedEmailClient = await db.query.clients.findFirst({
      where: eq(clients.id, clientByEmail.id),
    });
    expect(untouchedEmailClient?.email).toBe("conflict@example.com");

    await db.delete(clients).where(eq(clients.id, clientByEmail.id));
  });

  it("does not resurrect a soft-deleted client's identity when its phone is reused", async () => {
    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration not found");

    const [deletedClient] = await db
      .insert(clients)
      .values({
        type: "individual",
        name: "Soft-deleted Client",
        phone: "+919876600044",
        deletedAt: new Date(),
        createdBy: managerId,
      })
      .returning();
    if (!deletedClient) throw new Error("Failed to set up soft-deleted client");

    const created = await createEnquiry(input("9876600044"), managerScope);
    const result = await closeEnquiryAsSale(
      created.id,
      {
        name: created.name,
        phone: created.phone,
        email: undefined,
        address: undefined,
        pincode: undefined,
        services: [
          {
            serviceId: service.id,
            quotedPricePaise: service.basePricePaise,
            govtFeePaise: undefined,
          },
        ],
        comments: undefined,
      },
      managerScope,
    );

    expect(result?.client.id).not.toBe(deletedClient.id);
    expect(result?.client.deletedAt).toBeNull();
  });

  it("multi-service sale: creates one job card and one dedicated proforma invoice per service", async () => {
    const [pvtLtd, gst] = await Promise.all([
      db.query.services.findFirst({ where: eq(services.slug, "pvt-ltd-registration") }),
      db.query.services.findFirst({ where: eq(services.slug, "gst-registration") }),
    ]);
    if (!pvtLtd || !gst) throw new Error("Seed catalog first — pvt-ltd/gst registration not found");

    const created = await createEnquiry(input("9876600050"), managerScope);
    const result = await closeEnquiryAsSale(
      created.id,
      {
        name: created.name,
        phone: created.phone,
        email: undefined,
        address: undefined,
        pincode: undefined,
        services: [
          { serviceId: pvtLtd.id, quotedPricePaise: 1500000, govtFeePaise: 200000 },
          { serviceId: gst.id, quotedPricePaise: 300000, govtFeePaise: undefined },
        ],
        comments: undefined,
      },
      managerScope,
    );

    expect(result?.orders).toHaveLength(2);
    expect(result?.proformaInvoices).toHaveLength(2);

    const [pvtLtdOrder, gstOrder] = result?.orders ?? [];
    const [pvtLtdProforma, gstProforma] = result?.proformaInvoices ?? [];
    if (!pvtLtdOrder || !gstOrder || !pvtLtdProforma || !gstProforma) {
      throw new Error("Expected both orders and both proformas to be created");
    }

    // Each order carries its own service/price, not the other line's.
    expect(pvtLtdOrder.serviceId).toBe(pvtLtd.id);
    expect(pvtLtdOrder.quotedPricePaise).toBe(1500000);
    expect(gstOrder.serviceId).toBe(gst.id);
    expect(gstOrder.quotedPricePaise).toBe(300000);

    // Each proforma belongs to its own order and reflects only that service's line items —
    // never a single combined multi-service proforma.
    expect(pvtLtdProforma.orderId).toBe(pvtLtdOrder.id);
    expect(gstProforma.orderId).toBe(gstOrder.id);
    const pvtLtdLineItems = pvtLtdProforma.lineItems as Array<{ description: string }>;
    const gstLineItems = gstProforma.lineItems as Array<{ description: string }>;
    expect(pvtLtdLineItems.some((item) => item.description === pvtLtd.name)).toBe(true);
    expect(pvtLtdLineItems.some((item) => item.description === gst.name)).toBe(false);
    expect(gstLineItems.some((item) => item.description === gst.name)).toBe(true);
    expect(gstLineItems.some((item) => item.description === pvtLtd.name)).toBe(false);

    // Both job cards and both proformas got distinct, sequential new-format numbers.
    expect(pvtLtdOrder.orderNo).not.toBe(gstOrder.orderNo);
    expect(pvtLtdOrder.orderNo).toMatch(/^FMJC\d{4}\d{5}$/);
    expect(gstOrder.orderNo).toMatch(/^FMJC\d{4}\d{5}$/);
    expect(pvtLtdProforma.invoiceNo).not.toBe(gstProforma.invoiceNo);
    expect(pvtLtdProforma.invoiceNo).toMatch(/^FMPI\d{4}\d{5}$/);
    expect(gstProforma.invoiceNo).toMatch(/^FMPI\d{4}\d{5}$/);

    // Only the first order is recorded as the enquiry's convertedOrderId (known simplification).
    expect(result?.enquiry.convertedOrderId).toBe(pvtLtdOrder.id);
  });

  it("multi-service sale: an invalid service anywhere rolls back the entire transaction", async () => {
    const pvtLtd = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!pvtLtd) throw new Error("Seed catalog first — pvt-ltd-registration not found");

    const created = await createEnquiry(input("9876600051"), managerScope);

    await expect(
      closeEnquiryAsSale(
        created.id,
        {
          name: created.name,
          phone: created.phone,
          email: undefined,
          address: undefined,
          pincode: undefined,
          services: [
            { serviceId: pvtLtd.id, quotedPricePaise: 1500000, govtFeePaise: undefined },
            { serviceId: randomUUID(), quotedPricePaise: 300000, govtFeePaise: undefined },
          ],
          comments: undefined,
        },
        managerScope,
      ),
    ).rejects.toThrow("Service not found");

    // Nothing from this attempt survives: not the client, not the first (valid) line's order.
    const survivingClient = await db.query.clients.findFirst({
      where: eq(clients.phone, created.phone),
    });
    expect(survivingClient).toBeUndefined();

    const enquiryAfter = await getEnquiry(created.id, managerScope);
    expect(enquiryAfter?.status).not.toBe("won");
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
      services: [
        {
          serviceId: service.id,
          quotedPricePaise: service.basePricePaise,
          govtFeePaise: undefined,
        },
      ],
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

    it("excludes a won enquiry even if its old nextFollowUpAt is still set and overdue", async () => {
      const now = new Date("2026-06-15T12:00:00.000Z");
      const service = await db.query.services.findFirst({
        where: eq(services.slug, "pvt-ltd-registration"),
      });
      if (!service) throw new Error("Seed catalog first — pvt-ltd-registration not found");

      const won = await createEnquiry(
        input("9876600099", { assignedTo: execAId, nextFollowUpAt: subDays(now, 3) }),
        managerScope,
      );
      await closeEnquiryAsSale(
        won.id,
        {
          name: "Digest Won Customer",
          phone: won.phone,
          pincode: "560001",
          services: [{ serviceId: service.id, quotedPricePaise: 500000 }],
        },
        execAScope,
      );

      const due = await listFollowUpsDueForExecutive(execAId, now);
      expect(due.map((e) => e.id)).not.toContain(won.id);
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

describe("team scoping (ADR 0002, integration)", () => {
  const managerId = randomUUID();
  const salesExecId = randomUUID();
  const opsExecId = randomUUID();
  const noTeamExecId = randomUUID();
  const managerScope = makeScope(managerId, "manager");

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: managerId,
        name: "Team Test Manager",
        email: `team-manager-${managerId}@test.local`,
        emailVerified: true,
        role: "manager",
      },
      {
        id: salesExecId,
        name: "Team Test Sales Exec",
        email: `team-sales-${salesExecId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: opsExecId,
        name: "Team Test Ops Exec",
        email: `team-ops-${opsExecId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: noTeamExecId,
        name: "Team Test No-Team Exec",
        email: `team-none-${noTeamExecId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
    ]);
    await updateStaffTeam(salesExecId, "sales", managerScope);
    await updateStaffTeam(opsExecId, "operations", managerScope);
  });

  afterAll(async () => {
    await cleanupTestData("+919876603%");
    await db.delete(user).where(eq(user.id, managerId));
    await db.delete(user).where(eq(user.id, salesExecId));
    await db.delete(user).where(eq(user.id, opsExecId));
    await db.delete(user).where(eq(user.id, noTeamExecId));
  });

  it("hides every enquiry from an operations-team executive, even ones assigned to them", async () => {
    const created = await createEnquiry(
      input("9876603001", { assignedTo: opsExecId }),
      managerScope,
    );

    const opsScope = makeScope(opsExecId, "executive", { team: "operations" });
    const visible = await listEnquiries(opsScope);
    expect(visible.rows.map((e) => e.id)).not.toContain(created.id);
    expect(await getEnquiry(created.id, opsScope)).toBeUndefined();
  });

  it("leaves a sales-team executive's own-assigned visibility unaffected", async () => {
    const created = await createEnquiry(
      input("9876603002", { assignedTo: salesExecId }),
      managerScope,
    );

    const salesScope = makeScope(salesExecId, "executive", { team: "sales" });
    const visible = await listEnquiries(salesScope);
    expect(visible.rows.map((e) => e.id)).toContain(created.id);
    expect(await getEnquiry(created.id, salesScope)).toBeTruthy();
  });

  it("leaves an executive with no team set unaffected (regression guard)", async () => {
    const created = await createEnquiry(
      input("9876603003", { assignedTo: noTeamExecId }),
      managerScope,
    );

    const noTeamScope = makeScope(noTeamExecId, "executive");
    const visible = await listEnquiries(noTeamScope);
    expect(visible.rows.map((e) => e.id)).toContain(created.id);
  });

  it("leaves a new job card unassigned when Sales closes a sale (ADR 0002)", async () => {
    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration not found");

    const enquiry = await createEnquiry(
      input("9876603004", { assignedTo: salesExecId }),
      managerScope,
    );
    const salesScope = makeScope(salesExecId, "executive", { team: "sales" });
    const result = await closeEnquiryAsSale(
      enquiry.id,
      {
        name: "Team Test Sale Customer",
        phone: enquiry.phone,
        pincode: "560001",
        services: [{ serviceId: service.id, quotedPricePaise: 500000 }],
      },
      salesScope,
    );
    expect(result?.orders[0]?.assignedTo).toBeNull();
  });
});

describe("sales-executive personal dashboard (integration)", () => {
  const managerId = randomUUID();
  const salesAId = randomUUID();
  const salesBId = randomUUID();
  const managerScope = makeScope(managerId, "manager");
  const salesAScope = makeScope(salesAId, "executive", { team: "sales" });
  const salesBScope = makeScope(salesBId, "executive", { team: "sales" });

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: managerId,
        name: "Dashboard Test Manager",
        email: `dashboard-manager-${managerId}@test.local`,
        emailVerified: true,
        role: "manager",
      },
      {
        id: salesAId,
        name: "Dashboard Test Sales A",
        email: `dashboard-salesA-${salesAId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: salesBId,
        name: "Dashboard Test Sales B",
        email: `dashboard-salesB-${salesBId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
    ]);
    await updateStaffTeam(salesAId, "sales", managerScope);
    await updateStaffTeam(salesBId, "sales", managerScope);
  });

  afterAll(async () => {
    await cleanupTestData("+919876605%");
    await db.delete(user).where(eq(user.id, managerId));
    await db.delete(user).where(eq(user.id, salesAId));
    await db.delete(user).where(eq(user.id, salesBId));
  });

  it("lists only this rep's active (not won/lost) enquiries", async () => {
    const active = await createEnquiry(input("9876605001", { assignedTo: salesAId }), managerScope);
    const forOther = await createEnquiry(
      input("9876605002", { assignedTo: salesBId }),
      managerScope,
    );
    const lost = await createEnquiry(input("9876605003", { assignedTo: salesAId }), managerScope);
    await updateEnquiryStatus(
      lost.id,
      { status: "lost", lostReason: "Not interested" },
      managerScope,
    );
    const won = await createEnquiry(input("9876605019", { assignedTo: salesAId }), managerScope);
    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration not found");
    await closeEnquiryAsSale(
      won.id,
      {
        name: "Sales Dashboard Won Customer",
        phone: won.phone,
        pincode: "560001",
        services: [{ serviceId: service.id, quotedPricePaise: 500000 }],
      },
      salesAScope,
    );

    const mine = await listMyActiveEnquiries(salesAId);
    const mineIds = mine.map((e) => e.id);
    expect(mineIds).toContain(active.id);
    expect(mineIds).not.toContain(forOther.id);
    expect(mineIds).not.toContain(lost.id);
    // Regression coverage: a Sales-converted (won) enquiry must disappear from the sales
    // executive's active pipeline immediately — this is what backs the dashboard revalidation
    // fix in closeEnquiryAsSaleAction (previously only /enquiries was revalidated, not /dashboard).
    expect(mineIds).not.toContain(won.id);
  });

  it("shows unassigned enquiries in the open pool to any sales rep, excludes assigned/won/lost", async () => {
    const unassigned = await createEnquiry(input("9876605004"), managerScope);
    const assigned = await createEnquiry(
      input("9876605005", { assignedTo: salesAId }),
      managerScope,
    );

    const poolForA = await listOpenEnquiries(salesAScope);
    const poolForB = await listOpenEnquiries(salesBScope);
    expect(poolForA.map((e) => e.id)).toContain(unassigned.id);
    expect(poolForB.map((e) => e.id)).toContain(unassigned.id);
    expect(poolForA.map((e) => e.id)).not.toContain(assigned.id);
  });

  it("hides the open pool entirely from an operations-team executive", async () => {
    await createEnquiry(input("9876605006"), managerScope);
    const opsScope = makeScope(randomUUID(), "executive", { team: "operations" });
    expect(await listOpenEnquiries(opsScope)).toHaveLength(0);
  });

  it("claim is race-safe: the first pick wins, the second gets nothing", async () => {
    const created = await createEnquiry(input("9876605007"), managerScope);

    const [first, second] = await Promise.all([
      claimEnquiry(created.id, salesAScope),
      claimEnquiry(created.id, salesBScope),
    ]);
    const winners = [first, second].filter((result) => result !== null);
    expect(winners).toHaveLength(1);
    expect(winners[0]?.assignedTo).toMatch(new RegExp(`^(${salesAId}|${salesBId})$`));

    const refreshed = await getEnquiry(created.id, managerScope);
    expect([salesAId, salesBId]).toContain(refreshed?.assignedTo);
  });

  it("returns null when claiming an already-assigned enquiry", async () => {
    const created = await createEnquiry(
      input("9876605008", { assignedTo: salesAId }),
      managerScope,
    );
    expect(await claimEnquiry(created.id, salesBScope)).toBeNull();
  });

  it("splits my follow-ups into today vs missed, excluding future and other reps'", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");

    const missed = await createEnquiry(
      input("9876605009", { assignedTo: salesAId, nextFollowUpAt: subDays(now, 2) }),
      managerScope,
    );
    const dueToday = await createEnquiry(
      input("9876605010", { assignedTo: salesAId, nextFollowUpAt: now }),
      managerScope,
    );
    const future = await createEnquiry(
      input("9876605011", { assignedTo: salesAId, nextFollowUpAt: addDays(now, 3) }),
      managerScope,
    );
    const forOther = await createEnquiry(
      input("9876605012", { assignedTo: salesBId, nextFollowUpAt: subDays(now, 1) }),
      managerScope,
    );

    const split = await listMyFollowUpsSplit(salesAId, now);
    expect(split.missed.map((e) => e.id)).toContain(missed.id);
    expect(split.today.map((e) => e.id)).toContain(dueToday.id);
    expect(split.missed.map((e) => e.id)).not.toContain(dueToday.id);
    expect(split.today.map((e) => e.id)).not.toContain(future.id);
    expect([...split.today, ...split.missed].map((e) => e.id)).not.toContain(forOther.id);
  });

  it("lists my won and lost enquiries separately, with lost reasons attached", async () => {
    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration not found");

    const toWin = await createEnquiry(input("9876605013", { assignedTo: salesAId }), managerScope);
    await closeEnquiryAsSale(
      toWin.id,
      {
        name: toWin.name,
        phone: toWin.phone,
        email: undefined,
        address: undefined,
        pincode: undefined,
        services: [
          {
            serviceId: service.id,
            quotedPricePaise: service.basePricePaise,
            govtFeePaise: undefined,
          },
        ],
        comments: undefined,
      },
      salesAScope,
    );

    const toLose = await createEnquiry(input("9876605014", { assignedTo: salesAId }), managerScope);
    await updateEnquiryStatus(
      toLose.id,
      { status: "lost", lostReason: "Went with a competitor" },
      managerScope,
    );

    const won = await listMyWonEnquiries(salesAId);
    expect(won.map((e) => e.id)).toContain(toWin.id);
    expect(won.map((e) => e.id)).not.toContain(toLose.id);

    const lost = await listMyLostEnquiriesForExecutive(salesAId);
    expect(lost.map((e) => e.id)).toContain(toLose.id);
    expect(lost.map((e) => e.id)).not.toContain(toWin.id);
    expect(lost.find((e) => e.id === toLose.id)?.lostReason).toBe("Went with a competitor");
  });

  it("computes dashboard stat counts and this-rep's own sales value", async () => {
    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration not found");

    await createEnquiry(input("9876605015", { assignedTo: salesAId }), managerScope);
    await createEnquiry(input("9876605016", { assignedTo: salesAId }), managerScope);

    const toLose = await createEnquiry(input("9876605017", { assignedTo: salesAId }), managerScope);
    await updateEnquiryStatus(toLose.id, { status: "lost", lostReason: "Budget" }, managerScope);

    const toWin = await createEnquiry(input("9876605018", { assignedTo: salesAId }), managerScope);
    const sale = await closeEnquiryAsSale(
      toWin.id,
      {
        name: toWin.name,
        phone: toWin.phone,
        email: undefined,
        address: undefined,
        pincode: undefined,
        services: [{ serviceId: service.id, quotedPricePaise: 750000, govtFeePaise: undefined }],
        comments: undefined,
      },
      salesAScope,
    );
    if (!sale) throw new Error("Expected sale to close");

    const stats = await getMySalesDashboardStats(salesAId);
    expect(stats.totalEnquiries).toBeGreaterThanOrEqual(2);
    expect(stats.closedThisMonth).toBeGreaterThanOrEqual(1);
    expect(stats.lostThisMonth).toBeGreaterThanOrEqual(1);
    expect(stats.salesThisMonthPaise).toBeGreaterThanOrEqual(750000);
    expect(stats.totalSalesPaise).toBeGreaterThanOrEqual(750000);

    // B never closed a sale in this suite, regardless of how many enquiries land in B's pipeline.
    const statsForB = await getMySalesDashboardStats(salesBId);
    expect(statsForB.closedThisMonth).toBe(0);
    expect(statsForB.salesThisMonthPaise).toBe(0);
    expect(statsForB.totalSalesPaise).toBe(0);
  });
});
