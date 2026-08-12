import { randomUUID } from "node:crypto";
import { addDays, subDays, subMonths } from "date-fns";
import { and, eq, ilike, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { activityLogs } from "@/db/schema/activity-logs";
import { user } from "@/db/schema/auth-schema";
import { services } from "@/db/schema/catalog";
import { clients } from "@/db/schema/clients";
import { documents } from "@/db/schema/documents";
import { invoices, payments } from "@/db/schema/invoices";
import { orders, orderTasks } from "@/db/schema/orders";
import { makeScope } from "@/lib/test-scope";
import { createProformaInvoiceInTx, recordPayment } from "@/services/invoices";
import {
  createOrder,
  deleteOrder,
  formatJobCardNo,
  getDocsPendingOrderIds,
  getMyJobCardDashboardStats,
  getOrder,
  getOrderForNotification,
  jobCardYearMonth,
  listJobCardsAvailableToPickUp,
  listMyCancelledJobCards,
  listMyCompletedJobCards,
  listMyJobCards,
  listOrderOptions,
  listOrders,
  listOrdersForClient,
  listOrdersWithPendingDocs,
  orderEditSchema,
  orderInputSchema,
  pickUpJobCard,
  updateOrder,
  updateOrderStatus,
  updateOrderTaskStatus,
} from "@/services/orders";
import { setStaffServiceAssignments, updateStaffTeam } from "@/services/staff";

async function makeTestClient(phone: string, actorId: string) {
  const [client] = await db
    .insert(clients)
    .values({ type: "individual", name: "Order Test Client", phone, createdBy: actorId })
    .returning();
  if (!client) throw new Error("Failed to create test client");
  return client;
}

describe("jobCardYearMonth / formatJobCardNo (pure)", () => {
  // Constructed via the (year, monthIndex, day, ...) local-time form, not an ISO "Z" string —
  // jobCardYearMonth reads local-time getters (getFullYear/getMonth), so the two must agree
  // regardless of the test runner's own timezone.
  it("formats with 2-digit year, 2-digit month, and a 5-digit zero-padded sequence", () => {
    const yearMonth = jobCardYearMonth(new Date(2099, 0, 15, 12, 0, 0));
    expect(yearMonth).toBe("9901");
    expect(formatJobCardNo(yearMonth, 1)).toBe("FMJC990100001");
    expect(formatJobCardNo(yearMonth, 42)).toBe("FMJC990100042");
  });

  it("rolls over across a month boundary", () => {
    const endOfJanuary = jobCardYearMonth(new Date(2099, 0, 31, 12, 0, 0));
    const startOfFebruary = jobCardYearMonth(new Date(2099, 1, 1, 0, 0, 0));
    expect(endOfJanuary).toBe("9901");
    expect(startOfFebruary).toBe("9902");
    expect(endOfJanuary).not.toBe(startOfFebruary);
  });

  it("rolls over across a year boundary", () => {
    const endOfYear = jobCardYearMonth(new Date(2099, 11, 31, 12, 0, 0));
    const startOfNextYear = jobCardYearMonth(new Date(2100, 0, 1, 0, 0, 0));
    expect(endOfYear).toBe("9912");
    expect(startOfNextYear).toBe("0001");
  });
});

describe("orders service (integration)", () => {
  const managerId = randomUUID();
  const execAId = randomUUID();
  const execBId = randomUUID();

  const managerScope = makeScope(managerId, "manager");
  const execAScope = makeScope(execAId, "executive");
  const execBScope = makeScope(execBId, "executive");

  let pvtLtdServiceId: string;
  let pvtLtdServiceEstimatedDays: number;

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: managerId,
        name: "Order Test Manager",
        email: `order-manager-${managerId}@test.local`,
        emailVerified: true,
        role: "manager",
      },
      {
        id: execAId,
        name: "Order Test Exec A",
        email: `order-execA-${execAId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: execBId,
        name: "Order Test Exec B",
        email: `order-execB-${execBId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
    ]);

    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration service not found");
    pvtLtdServiceId = service.id;
    pvtLtdServiceEstimatedDays = service.estimatedDays;
  });

  afterAll(async () => {
    const testOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(ilike(orders.notes, "order-test-marker%"));

    const orderIds = testOrders.map((o) => o.id);
    if (orderIds.length > 0) {
      for (const id of orderIds) {
        await db.delete(orderTasks).where(eq(orderTasks.orderId, id));
        await db
          .delete(documents)
          .where(and(eq(documents.ownerType, "order"), eq(documents.ownerId, id)));
      }
    }
    await db.delete(orders).where(ilike(orders.notes, "order-test-marker%"));
    await db.delete(clients).where(ilike(clients.phone, "+919876602%"));
    await db.delete(user).where(eq(user.id, managerId));
    await db.delete(user).where(eq(user.id, execAId));
    await db.delete(user).where(eq(user.id, execBId));
  });

  it("creating a Pvt Ltd Registration order spawns its task and document checklist in one transaction", async () => {
    const client = await makeTestClient("+919876602001", managerId);

    const order = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 1499900,
        govtFeePaise: 200000,
        assignedTo: execAId,
        notes: "order-test-marker checklist",
      },
      managerScope,
    );

    expect(order.orderNo).toMatch(/^FMJC\d{4}\d{5}$/);
    expect(order.assignedTo).toBe(execAId);

    const tasks = await db.query.orderTasks.findMany({ where: eq(orderTasks.orderId, order.id) });
    expect(tasks).toHaveLength(5);
    expect(tasks.map((t) => t.title)).toEqual(
      expect.arrayContaining([
        "Name approval (RUN)",
        "Obtain Digital Signature Certificates",
        "Draft MOA & AOA",
        "File SPICe+ with ROC",
        "Receive Certificate of Incorporation",
      ]),
    );
    // dueAt is derived from startedAt + dayOffset — every task's due date must be >= order.startedAt.
    for (const task of tasks) {
      expect(task.dueAt).not.toBeNull();
      expect((task.dueAt as Date).getTime()).toBeGreaterThanOrEqual(order.startedAt.getTime());
      expect(task.assignedTo).toBe(execAId);
    }

    const docs = await db.query.documents.findMany({
      where: and(eq(documents.ownerType, "order"), eq(documents.ownerId, order.id)),
    });
    expect(docs).toHaveLength(5);
    expect(docs.every((d) => d.status === "pending")).toBe(true);
    expect(docs.some((d) => d.kind === "pan_card")).toBe(true);
    expect(docs.some((d) => d.kind === "aadhaar")).toBe(true);

    // dueAt = startedAt + service.estimatedDays
    const expectedDueAt =
      order.startedAt.getTime() + pvtLtdServiceEstimatedDays * 24 * 60 * 60 * 1000;
    expect(order.dueAt.getTime()).toBe(expectedDueAt);
  });

  it("generates increasing, unique job card numbers within the same month", async () => {
    const client = await makeTestClient("+919876602002", managerId);

    const first = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        notes: "order-test-marker sequencing 1",
      },
      managerScope,
    );
    const second = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        notes: "order-test-marker sequencing 2",
      },
      managerScope,
    );

    // The sequence counter is a shared, lock-protected global (per year+month), so other test
    // files creating orders concurrently can interleave — assert monotonic increase, not exact +1.
    const firstSeq = Number(first.orderNo.slice(8));
    const secondSeq = Number(second.orderNo.slice(8));
    expect(secondSeq).toBeGreaterThan(firstSeq);
    expect(first.orderNo).not.toBe(second.orderNo);
  });

  it("lets an executive see and fetch only orders assigned to them", async () => {
    const client = await makeTestClient("+919876602003", managerId);
    const orderForA = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        assignedTo: execAId,
        notes: "order-test-marker scoping A",
      },
      managerScope,
    );
    const orderForB = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        assignedTo: execBId,
        notes: "order-test-marker scoping B",
      },
      managerScope,
    );

    const aList = await listOrders(execAScope);
    expect(aList.rows.map((o) => o.id)).toContain(orderForA.id);
    expect(aList.rows.map((o) => o.id)).not.toContain(orderForB.id);

    expect(await getOrder(orderForB.id, execAScope)).toBeUndefined();
    expect(await getOrder(orderForA.id, execAScope)).toBeTruthy();

    const clientOrders = await listOrdersForClient(client.id, execAScope);
    expect(clientOrders.map((o) => o.id)).toContain(orderForA.id);
    expect(clientOrders.map((o) => o.id)).not.toContain(orderForB.id);

    const clientOrdersAsManager = await listOrdersForClient(client.id, managerScope);
    expect(clientOrdersAsManager.map((o) => o.id)).toEqual(
      expect.arrayContaining([orderForA.id, orderForB.id]),
    );
  });

  it("forces assignedTo to self when an operations-team executive creates an order", async () => {
    const client = await makeTestClient("+919876602004", managerId);
    const opsScope = makeScope(execAId, "executive", { team: "operations" });
    const order = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        assignedTo: execBId,
        notes: "order-test-marker self-assign",
      },
      opsScope,
    );
    expect(order.assignedTo).toBe(execAId);
  });

  it("does NOT force assignedTo to self for an executive with no team set (ADR 0002)", async () => {
    const client = await makeTestClient("+919876602034", managerId);
    const order = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        assignedTo: execBId,
        notes: "order-test-marker no-team-self-assign",
      },
      execAScope,
    );
    expect(order.assignedTo).toBe(execBId);
  });

  it("does NOT force assignedTo to self for a sales-team executive creating an order", async () => {
    const client = await makeTestClient("+919876602024", managerId);
    const salesScope = makeScope(execAId, "executive", { team: "sales" });
    const order = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        assignedTo: execBId,
        notes: "order-test-marker sales-team-self-assign",
      },
      salesScope,
    );
    expect(order.assignedTo).toBe(execBId);
  });

  it("updates editable fields without touching client/service/dates", async () => {
    const client = await makeTestClient("+919876602005", managerId);
    const order = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        notes: "order-test-marker edit",
      },
      managerScope,
    );

    const updated = await updateOrder(
      order.id,
      {
        quotedPricePaise: 250000,
        govtFeePaise: 5000,
        assignedTo: execAId,
        notes: "order-test-marker edited",
      },
      managerScope,
    );
    expect(updated?.quotedPricePaise).toBe(250000);
    expect(updated?.clientId).toBe(client.id);
    expect(updated?.serviceId).toBe(pvtLtdServiceId);
  });

  it("sets completedAt when marked completed and clears it when reopened", async () => {
    const client = await makeTestClient("+919876602006", managerId);
    const order = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        notes: "order-test-marker completion",
      },
      managerScope,
    );
    // The hard completion gate (ADR 0002) requires every task done first.
    await db.update(orderTasks).set({ status: "done" }).where(eq(orderTasks.orderId, order.id));

    const completed = await updateOrderStatus(order.id, "completed", managerScope);
    expect(completed?.completedAt).toBeTruthy();

    const reopened = await updateOrderStatus(order.id, "in_progress", managerScope);
    expect(reopened?.completedAt).toBeNull();
  });

  it("updates a task's status when scoped correctly, and rejects it otherwise", async () => {
    const client = await makeTestClient("+919876602007", managerId);
    const order = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        assignedTo: execAId,
        notes: "order-test-marker task status",
      },
      managerScope,
    );
    const task = (
      await db.query.orderTasks.findMany({ where: eq(orderTasks.orderId, order.id) })
    )[0];
    if (!task) throw new Error("expected a generated task");

    const blocked = await updateOrderTaskStatus(order.id, task.id, "done", execBScope);
    expect(blocked).toBeNull();

    const updated = await updateOrderTaskStatus(order.id, task.id, "done", execAScope);
    expect(updated?.status).toBe("done");
  });

  it("computes docs-pending correctly and reflects it via listOrders", async () => {
    const client = await makeTestClient("+919876602008", managerId);
    const order = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        notes: "order-test-marker docs pending",
      },
      managerScope,
    );

    const pendingIds = await getDocsPendingOrderIds([order.id]);
    expect(pendingIds.has(order.id)).toBe(true);

    const docs = await db.query.documents.findMany({
      where: and(eq(documents.ownerType, "order"), eq(documents.ownerId, order.id)),
    });
    await db
      .update(documents)
      .set({ status: "verified" })
      .where(and(eq(documents.ownerType, "order"), eq(documents.ownerId, order.id)));

    const stillPending = await getDocsPendingOrderIds([order.id]);
    expect(stillPending.has(order.id)).toBe(false);
    expect(docs.length).toBeGreaterThan(0);

    const list = await listOrders(managerScope, { search: order.orderNo });
    const row = list.rows.find((r) => r.id === order.id);
    expect(row?.docsPending).toBe(false);
  });

  it("filters listOrders by status", async () => {
    const client = await makeTestClient("+919876602010", managerId);
    const order = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        notes: "order-test-marker status filter",
      },
      managerScope,
    );
    await updateOrderStatus(order.id, "on_hold", managerScope);

    const matching = await listOrders(managerScope, { status: "on_hold" });
    expect(matching.rows.map((r) => r.id)).toContain(order.id);

    const nonMatching = await listOrders(managerScope, { status: "cancelled" });
    expect(nonMatching.rows.map((r) => r.id)).not.toContain(order.id);
  });

  it("treats an empty govtFeePaise form field as omitted", () => {
    const parsedCreate = orderInputSchema.parse({
      clientId: randomUUID(),
      serviceId: randomUUID(),
      quotedPricePaise: "100000",
      govtFeePaise: "",
    });
    expect(parsedCreate.govtFeePaise).toBeUndefined();

    const parsedEdit = orderEditSchema.parse({ quotedPricePaise: "100000", govtFeePaise: "" });
    expect(parsedEdit.govtFeePaise).toBeUndefined();
  });

  it("soft-deletes an order so it no longer appears in scoped queries", async () => {
    const client = await makeTestClient("+919876602009", managerId);
    const order = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        notes: "order-test-marker delete",
      },
      managerScope,
    );

    const deleted = await deleteOrder(order.id, managerScope);
    expect(deleted?.deletedAt).toBeTruthy();
    expect(await getOrder(order.id, managerScope)).toBeUndefined();
  });

  it("scopes listOrderOptions to an executive's assigned orders, but not a manager", async () => {
    const client = await makeTestClient("+919876602011", managerId);
    const orderForA = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        assignedTo: execAId,
        notes: "order-test-marker options-scoped-A",
      },
      managerScope,
    );
    const orderForB = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        assignedTo: execBId,
        notes: "order-test-marker options-scoped-B",
      },
      managerScope,
    );

    const execOptions = await listOrderOptions(execAScope);
    expect(execOptions.map((o) => o.id)).toContain(orderForA.id);
    expect(execOptions.map((o) => o.id)).not.toContain(orderForB.id);

    const managerOptions = await listOrderOptions(managerScope);
    expect(managerOptions.map((o) => o.id)).toEqual(
      expect.arrayContaining([orderForA.id, orderForB.id]),
    );
    expect(managerOptions.find((o) => o.id === orderForA.id)?.client.name).toBe(client.name);
  });

  it("getOrderForNotification returns the order with the client's contact info, unscoped", async () => {
    const client = await makeTestClient("+919876602012", managerId);
    const order = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        notes: "order-test-marker notify-fetch",
      },
      managerScope,
    );

    const fetched = await getOrderForNotification(order.id);
    expect(fetched?.orderNo).toBe(order.orderNo);
    expect(fetched?.client.phone).toBe(client.phone);
    expect(fetched?.client.whatsappOptedOut).toBe(false);

    expect(await getOrderForNotification(randomUUID())).toBeUndefined();
  });

  it("listOrdersWithPendingDocs includes freshly created orders and excludes ones with all docs verified", async () => {
    const client = await makeTestClient("+919876602013", managerId);
    const order = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        notes: "order-test-marker docs-pending-cron",
      },
      managerScope,
    );

    const beforeVerify = await listOrdersWithPendingDocs();
    expect(beforeVerify.map((o) => o.id)).toContain(order.id);

    await db
      .update(documents)
      .set({ status: "verified" })
      .where(and(eq(documents.ownerType, "order"), eq(documents.ownerId, order.id)));

    const afterVerify = await listOrdersWithPendingDocs();
    expect(afterVerify.map((o) => o.id)).not.toContain(order.id);
  });

  it("listOrdersWithPendingDocs excludes completed and cancelled orders even if docs are still pending", async () => {
    const client = await makeTestClient("+919876602014", managerId);
    const order = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        notes: "order-test-marker docs-pending-completed",
      },
      managerScope,
    );
    // The hard completion gate (ADR 0002) requires every task done first.
    await db.update(orderTasks).set({ status: "done" }).where(eq(orderTasks.orderId, order.id));
    await updateOrderStatus(order.id, "completed", managerScope);

    const pending = await listOrdersWithPendingDocs();
    expect(pending.map((o) => o.id)).not.toContain(order.id);
  });
});

describe("team scoping (ADR 0002, integration)", () => {
  const managerId = randomUUID();
  const salesExecId = randomUUID();
  const opsExecId = randomUUID();
  const managerScope = makeScope(managerId, "manager");
  let pvtLtdServiceId: string;
  let gstServiceId: string;

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: managerId,
        name: "Order Team Test Manager",
        email: `order-team-manager-${managerId}@test.local`,
        emailVerified: true,
        role: "manager",
      },
      {
        id: salesExecId,
        name: "Order Team Test Sales Exec",
        email: `order-team-sales-${salesExecId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: opsExecId,
        name: "Order Team Test Ops Exec",
        email: `order-team-ops-${opsExecId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
    ]);
    await updateStaffTeam(salesExecId, "sales", managerScope);
    await updateStaffTeam(opsExecId, "operations", managerScope);

    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration service not found");
    pvtLtdServiceId = service.id;

    const gstService = await db.query.services.findFirst({
      where: eq(services.slug, "gst-registration"),
    });
    if (!gstService) throw new Error("Seed catalog first — gst-registration service not found");
    gstServiceId = gstService.id;
  });

  afterAll(async () => {
    await db.delete(orders).where(ilike(orders.notes, "order-team-test-marker%"));
    await db.delete(clients).where(ilike(clients.phone, "+919876609%"));
    await db.delete(user).where(eq(user.id, managerId));
    await db.delete(user).where(eq(user.id, salesExecId));
    await db.delete(user).where(eq(user.id, opsExecId));
  });

  it("hides every order from a sales-team executive, even ones assigned to them", async () => {
    const client = await makeTestClient("+919876609001", managerId);
    const order = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        assignedTo: salesExecId,
        notes: "order-team-test-marker sales-hidden",
      },
      managerScope,
    );

    const salesScope = makeScope(salesExecId, "executive", { team: "sales" });
    const visible = await listOrders(salesScope);
    expect(visible.rows.map((o) => o.id)).not.toContain(order.id);
    expect(await getOrder(order.id, salesScope)).toBeUndefined();
  });

  it("leaves an operations-team executive's own-assigned visibility unaffected", async () => {
    await setStaffServiceAssignments(opsExecId, [pvtLtdServiceId], managerScope);

    const client = await makeTestClient("+919876609002", managerId);
    const order = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        assignedTo: opsExecId,
        notes: "order-team-test-marker ops-visible",
      },
      managerScope,
    );

    const opsScope = makeScope(opsExecId, "executive", { team: "operations" });
    const visible = await listOrders(opsScope);
    expect(visible.rows.map((o) => o.id)).toContain(order.id);
    expect(await getOrder(order.id, opsScope)).toBeTruthy();
  });

  describe("mandatory operations service scope (ADR 0004)", () => {
    it("rejects assigning a job card to an operations executive with zero service assignments", async () => {
      await setStaffServiceAssignments(opsExecId, [], managerScope);
      const client = await makeTestClient("+919876609010", managerId);

      await expect(
        createOrder(
          {
            clientId: client.id,
            serviceId: pvtLtdServiceId,
            quotedPricePaise: 100000,
            assignedTo: opsExecId,
            notes: "order-team-test-marker mandatory-unscoped",
          },
          managerScope,
        ),
      ).rejects.toThrow(/isn't scoped to this service/);
    });

    it("rejects assigning a job card to an operations executive scoped to a different service", async () => {
      await setStaffServiceAssignments(opsExecId, [gstServiceId], managerScope);
      const client = await makeTestClient("+919876609011", managerId);

      await expect(
        createOrder(
          {
            clientId: client.id,
            serviceId: pvtLtdServiceId,
            quotedPricePaise: 100000,
            assignedTo: opsExecId,
            notes: "order-team-test-marker mandatory-mismatched",
          },
          managerScope,
        ),
      ).rejects.toThrow(/isn't scoped to this service/);
    });

    it("allows assigning a job card to an operations executive scoped to that service", async () => {
      await setStaffServiceAssignments(opsExecId, [pvtLtdServiceId, gstServiceId], managerScope);
      const client = await makeTestClient("+919876609012", managerId);

      const order = await createOrder(
        {
          clientId: client.id,
          serviceId: pvtLtdServiceId,
          quotedPricePaise: 100000,
          assignedTo: opsExecId,
          notes: "order-team-test-marker mandatory-scoped",
        },
        managerScope,
      );
      expect(order.assignedTo).toBe(opsExecId);
    });

    it("does not constrain a sales-team executive's assignment by service scope", async () => {
      await setStaffServiceAssignments(salesExecId, [], managerScope);
      const client = await makeTestClient("+919876609013", managerId);

      const order = await createOrder(
        {
          clientId: client.id,
          serviceId: pvtLtdServiceId,
          quotedPricePaise: 100000,
          assignedTo: salesExecId,
          notes: "order-team-test-marker mandatory-sales-unaffected",
        },
        managerScope,
      );
      expect(order.assignedTo).toBe(salesExecId);
    });

    it("rejects reassigning an existing job card via updateOrder to an out-of-scope operations executive", async () => {
      await setStaffServiceAssignments(opsExecId, [gstServiceId], managerScope);
      const client = await makeTestClient("+919876609014", managerId);
      const order = await createOrder(
        {
          clientId: client.id,
          serviceId: pvtLtdServiceId,
          quotedPricePaise: 100000,
          notes: "order-team-test-marker mandatory-reassign",
        },
        managerScope,
      );

      await expect(
        updateOrder(
          order.id,
          {
            quotedPricePaise: 100000,
            assignedTo: opsExecId,
            notes: "order-team-test-marker mandatory-reassign",
          },
          managerScope,
        ),
      ).rejects.toThrow(/isn't scoped to this service/);
    });
  });

  describe("job card pickup (ADR 0005, integration)", () => {
    it("lists an unassigned in-scope job card as available to pick up, but not an out-of-scope one", async () => {
      await setStaffServiceAssignments(opsExecId, [pvtLtdServiceId], managerScope);
      const clientA = await makeTestClient("+919876609020", managerId);
      const clientB = await makeTestClient("+919876609021", managerId);

      const inScope = await createOrder(
        {
          clientId: clientA.id,
          serviceId: pvtLtdServiceId,
          quotedPricePaise: 100000,
          notes: "order-team-test-marker pickup-in-scope",
        },
        managerScope,
      );
      const outOfScope = await createOrder(
        {
          clientId: clientB.id,
          serviceId: gstServiceId,
          quotedPricePaise: 100000,
          notes: "order-team-test-marker pickup-out-of-scope",
        },
        managerScope,
      );

      const opsScope = makeScope(opsExecId, "executive", {
        team: "operations",
        serviceIds: [pvtLtdServiceId],
      });
      const available = await listJobCardsAvailableToPickUp(opsScope);
      const availableIds = available.map((order) => order.id);
      expect(availableIds).toContain(inScope.id);
      expect(availableIds).not.toContain(outOfScope.id);
    });

    it("returns nothing for an operations executive with no service scope, or a sales-team executive", async () => {
      await setStaffServiceAssignments(opsExecId, [], managerScope);
      const client = await makeTestClient("+919876609022", managerId);
      await createOrder(
        {
          clientId: client.id,
          serviceId: pvtLtdServiceId,
          quotedPricePaise: 100000,
          notes: "order-team-test-marker pickup-unscoped-exec",
        },
        managerScope,
      );

      const unscopedOpsScope = makeScope(opsExecId, "executive", { team: "operations" });
      expect(await listJobCardsAvailableToPickUp(unscopedOpsScope)).toEqual([]);

      const salesScope = makeScope(salesExecId, "executive", { team: "sales" });
      expect(await listJobCardsAvailableToPickUp(salesScope)).toEqual([]);
    });

    it("lets an in-scope operations executive pick up an unassigned job card, and it becomes visible/gettable to them", async () => {
      await setStaffServiceAssignments(opsExecId, [pvtLtdServiceId], managerScope);
      const client = await makeTestClient("+919876609023", managerId);
      const order = await createOrder(
        {
          clientId: client.id,
          serviceId: pvtLtdServiceId,
          quotedPricePaise: 100000,
          notes: "order-team-test-marker pickup-success",
        },
        managerScope,
      );

      const opsScope = makeScope(opsExecId, "executive", {
        team: "operations",
        serviceIds: [pvtLtdServiceId],
      });

      // Visibility fix (ADR 0005): visible and gettable even before being picked up.
      expect(await getOrder(order.id, opsScope)).toBeTruthy();
      const visibleBeforePickup = await listOrders(opsScope);
      expect(visibleBeforePickup.rows.map((row) => row.id)).toContain(order.id);

      const pickedUp = await pickUpJobCard(order.id, opsScope);
      expect(pickedUp?.assignedTo).toBe(opsExecId);

      const refetched = await getOrder(order.id, opsScope);
      expect(refetched?.assignedTo).toBe(opsExecId);
    });

    it("rejects picking up a job card outside the executive's service scope", async () => {
      await setStaffServiceAssignments(opsExecId, [gstServiceId], managerScope);
      const client = await makeTestClient("+919876609024", managerId);
      const order = await createOrder(
        {
          clientId: client.id,
          serviceId: pvtLtdServiceId,
          quotedPricePaise: 100000,
          notes: "order-team-test-marker pickup-out-of-scope-reject",
        },
        managerScope,
      );

      const opsScope = makeScope(opsExecId, "executive", { team: "operations" });
      await expect(pickUpJobCard(order.id, opsScope)).rejects.toThrow(
        /isn't scoped to this service/,
      );
    });

    it("returns null (not an error) when picking up a job card someone else already claimed", async () => {
      await setStaffServiceAssignments(opsExecId, [pvtLtdServiceId], managerScope);
      const client = await makeTestClient("+919876609025", managerId);
      const order = await createOrder(
        {
          clientId: client.id,
          serviceId: pvtLtdServiceId,
          quotedPricePaise: 100000,
          assignedTo: salesExecId, // already claimed, simulating a race
          notes: "order-team-test-marker pickup-already-taken",
        },
        managerScope,
      );

      const opsScope = makeScope(opsExecId, "executive", { team: "operations" });
      expect(await pickUpJobCard(order.id, opsScope)).toBeNull();
    });
  });
});

describe("hard completion gate (ADR 0002, integration)", () => {
  const managerId = randomUUID();
  const superAdminId = randomUUID();
  const managerScope = makeScope(managerId, "manager");
  const superAdminScope = makeScope(superAdminId, "super_admin");
  let pvtLtdServiceId: string;

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: managerId,
        name: "Gate Test Manager",
        email: `gate-manager-${managerId}@test.local`,
        emailVerified: true,
        role: "manager",
      },
      {
        id: superAdminId,
        name: "Gate Test Super Admin",
        email: `gate-superadmin-${superAdminId}@test.local`,
        emailVerified: true,
        role: "super_admin",
      },
    ]);

    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration service not found");
    pvtLtdServiceId = service.id;
  });

  afterAll(async () => {
    const testOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(ilike(orders.notes, "gate-test-marker%"));
    const orderIds = testOrders.map((o) => o.id);
    for (const id of orderIds) {
      await db.delete(orderTasks).where(eq(orderTasks.orderId, id));
      await db
        .delete(documents)
        .where(and(eq(documents.ownerType, "order"), eq(documents.ownerId, id)));
    }

    const testClients = await db
      .select({ id: clients.id })
      .from(clients)
      .where(ilike(clients.phone, "+919876610%"));
    const clientIds = testClients.map((c) => c.id);
    if (clientIds.length > 0) {
      const testInvoices = await db
        .select({ id: invoices.id })
        .from(invoices)
        .where(inArray(invoices.clientId, clientIds));
      const invoiceIds = testInvoices.map((i) => i.id);
      if (invoiceIds.length > 0) {
        await db.delete(payments).where(inArray(payments.invoiceId, invoiceIds));
        await db.delete(invoices).where(inArray(invoices.id, invoiceIds));
      }
    }

    await db.delete(orders).where(ilike(orders.notes, "gate-test-marker%"));
    await db.delete(clients).where(ilike(clients.phone, "+919876610%"));
    await db.delete(user).where(eq(user.id, managerId));
    await db.delete(user).where(eq(user.id, superAdminId));
  });

  async function makeOrder(phone: string, marker: string) {
    const client = await makeTestClient(phone, managerId);
    return createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        notes: marker,
      },
      managerScope,
    );
  }

  it("blocks completion while any task is still open", async () => {
    const order = await makeOrder("+919876610001", "gate-test-marker open-tasks");

    await expect(updateOrderStatus(order.id, "completed", managerScope)).rejects.toThrow(
      "All tasks must be marked done",
    );

    const stillOpen = await getOrder(order.id, managerScope);
    expect(stillOpen?.status).not.toBe("completed");
  });

  it("blocks completion while the proforma is unpaid", async () => {
    const order = await makeOrder("+919876610002", "gate-test-marker unpaid-proforma");
    await db.update(orderTasks).set({ status: "done" }).where(eq(orderTasks.orderId, order.id));

    await db.transaction((tx) =>
      createProformaInvoiceInTx(
        tx,
        {
          clientId: order.clientId,
          orderId: order.id,
          lineItems: [{ description: "Pvt Ltd Registration", qty: 1, ratePaise: 100000 }],
          gstRate: 18,
        },
        managerScope,
      ),
    );

    await expect(updateOrderStatus(order.id, "completed", managerScope)).rejects.toThrow(
      "proforma invoice must be paid in full",
    );
  });

  it("allows completion with zero tasks and no proforma at all", async () => {
    const order = await makeOrder("+919876610003", "gate-test-marker zero-tasks");
    await db.delete(orderTasks).where(eq(orderTasks.orderId, order.id));

    const completed = await updateOrderStatus(order.id, "completed", managerScope);
    expect(completed?.status).toBe("completed");
    expect(completed?.completedAt).toBeTruthy();
  });

  it("allows completion once every task is done, for an order with no proforma at all", async () => {
    const order = await makeOrder("+919876610004", "gate-test-marker tasks-done-no-proforma");
    await db.update(orderTasks).set({ status: "done" }).where(eq(orderTasks.orderId, order.id));

    const completed = await updateOrderStatus(order.id, "completed", managerScope);
    expect(completed?.status).toBe("completed");
  });

  it("allows completion once every task is done and the proforma is paid in full", async () => {
    const order = await makeOrder("+919876610005", "gate-test-marker paid-and-done");
    await db.update(orderTasks).set({ status: "done" }).where(eq(orderTasks.orderId, order.id));

    const proforma = await db.transaction((tx) =>
      createProformaInvoiceInTx(
        tx,
        {
          clientId: order.clientId,
          orderId: order.id,
          lineItems: [{ description: "Pvt Ltd Registration", qty: 1, ratePaise: 100000 }],
          gstRate: 18,
        },
        managerScope,
      ),
    );
    await recordPayment(
      proforma.id,
      { amountPaise: proforma.totalPaise, method: "upi" },
      managerScope,
    );

    const completed = await updateOrderStatus(order.id, "completed", managerScope);
    expect(completed?.status).toBe("completed");
  });

  it("silently ignores force:true from a manager — the gate still applies", async () => {
    const order = await makeOrder("+919876610006", "gate-test-marker manager-force-ignored");

    await expect(
      updateOrderStatus(order.id, "completed", managerScope, { force: true }),
    ).rejects.toThrow("All tasks must be marked done");
  });

  it("lets a super_admin force-complete despite open tasks, and logs it as status_changed_forced", async () => {
    const order = await makeOrder("+919876610007", "gate-test-marker superadmin-force");

    const completed = await updateOrderStatus(order.id, "completed", superAdminScope, {
      force: true,
    });
    expect(completed?.status).toBe("completed");
    expect(completed?.completedAt).toBeTruthy();

    const logs = await db.query.activityLogs.findMany({
      where: and(
        eq(activityLogs.entityType, "order"),
        eq(activityLogs.entityId, order.id),
        eq(activityLogs.action, "status_changed_forced"),
      ),
    });
    expect(logs.length).toBeGreaterThan(0);
  });
});

describe("operations-executive dashboard data (integration)", () => {
  const managerId = randomUUID();
  const execAId = randomUUID();
  const execBId = randomUUID();
  // A dedicated third executive, used only by the combined stats test below — that test needs an
  // executive with *no* other job cards in play, and execA already accumulates WIP orders from
  // the two list-function tests that run before it in this same describe block.
  const execCId = randomUUID();
  const managerScope = makeScope(managerId, "manager");

  let pvtLtdServiceId: string;

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: managerId,
        name: "Ops Dashboard Test Manager",
        email: `ops-dash-manager-${managerId}@test.local`,
        emailVerified: true,
        role: "manager",
      },
      {
        id: execAId,
        name: "Ops Dashboard Test Exec A",
        email: `ops-dash-execA-${execAId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: execBId,
        name: "Ops Dashboard Test Exec B",
        email: `ops-dash-execB-${execBId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: execCId,
        name: "Ops Dashboard Test Exec C",
        email: `ops-dash-execC-${execCId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
    ]);

    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration service not found");
    pvtLtdServiceId = service.id;
  });

  afterAll(async () => {
    const testOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(ilike(orders.notes, "ops-dashboard-test-marker%"));
    const orderIds = testOrders.map((o) => o.id);
    if (orderIds.length > 0) {
      for (const id of orderIds) {
        await db.delete(orderTasks).where(eq(orderTasks.orderId, id));
        await db
          .delete(documents)
          .where(and(eq(documents.ownerType, "order"), eq(documents.ownerId, id)));
      }
    }
    await db.delete(orders).where(ilike(orders.notes, "ops-dashboard-test-marker%"));
    await db.delete(clients).where(ilike(clients.phone, "+919876611%"));
    await db.delete(user).where(eq(user.id, managerId));
    await db.delete(user).where(eq(user.id, execAId));
    await db.delete(user).where(eq(user.id, execBId));
    await db.delete(user).where(eq(user.id, execCId));
  });

  async function makeOrder(phone: string, marker: string, assignedTo: string) {
    const client = await makeTestClient(phone, managerId);
    return createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        assignedTo,
        notes: marker,
      },
      managerScope,
    );
  }

  it("listMyJobCards returns only this executive's WIP orders, excluding completed/cancelled/other-exec", async () => {
    const wip = await makeOrder("+919876611001", "ops-dashboard-test-marker list-wip", execAId);
    const completed = await makeOrder(
      "+919876611002",
      "ops-dashboard-test-marker list-completed",
      execAId,
    );
    await db.update(orders).set({ status: "completed" }).where(eq(orders.id, completed.id));
    const cancelled = await makeOrder(
      "+919876611003",
      "ops-dashboard-test-marker list-cancelled",
      execAId,
    );
    await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, cancelled.id));
    const forOther = await makeOrder(
      "+919876611004",
      "ops-dashboard-test-marker list-other-exec",
      execBId,
    );

    const rows = await listMyJobCards(execAId);
    const ids = rows.map((row) => row.id);
    expect(ids).toContain(wip.id);
    expect(ids).not.toContain(completed.id);
    expect(ids).not.toContain(cancelled.id);
    expect(ids).not.toContain(forOther.id);
    expect(rows.find((row) => row.id === wip.id)?.docsPending).toBe(true);
  });

  it("listMyCompletedJobCards and listMyCancelledJobCards each return only their own status", async () => {
    const wip = await makeOrder("+919876611005", "ops-dashboard-test-marker split-wip", execAId);
    const completed = await makeOrder(
      "+919876611006",
      "ops-dashboard-test-marker split-completed",
      execAId,
    );
    await db.update(orders).set({ status: "completed" }).where(eq(orders.id, completed.id));
    const cancelled = await makeOrder(
      "+919876611007",
      "ops-dashboard-test-marker split-cancelled",
      execAId,
    );
    await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, cancelled.id));

    const completedRows = await listMyCompletedJobCards(execAId);
    expect(completedRows.map((row) => row.id)).toContain(completed.id);
    expect(completedRows.map((row) => row.id)).not.toContain(wip.id);
    expect(completedRows.map((row) => row.id)).not.toContain(cancelled.id);

    const cancelledRows = await listMyCancelledJobCards(execAId);
    expect(cancelledRows.map((row) => row.id)).toContain(cancelled.id);
    expect(cancelledRows.map((row) => row.id)).not.toContain(wip.id);
    expect(cancelledRows.map((row) => row.id)).not.toContain(completed.id);
  });

  it("getMyJobCardDashboardStats counts each stat correctly against a frozen now", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");

    // execC is dedicated to this test alone (execA already has WIP orders from the tests above).

    // Due soon (within 7 days), docs left pending by the auto-generated checklist.
    const dueSoon = await makeOrder(
      "+919876611010",
      "ops-dashboard-test-marker stats-due-soon",
      execCId,
    );
    await db
      .update(orders)
      .set({ dueAt: addDays(now, 3) })
      .where(eq(orders.id, dueSoon.id));
    const [overdueTask] = await db.query.orderTasks.findMany({
      where: eq(orderTasks.orderId, dueSoon.id),
      limit: 1,
    });
    if (!overdueTask) throw new Error("Expected at least one auto-generated task");
    await db
      .update(orderTasks)
      .set({ dueAt: subDays(now, 2), status: "pending" })
      .where(eq(orderTasks.id, overdueTask.id));
    // A second, already-done task with a past due date must NOT count as overdue.
    const otherTasks = await db.query.orderTasks.findMany({
      where: eq(orderTasks.orderId, dueSoon.id),
    });
    const secondTask = otherTasks.find((task) => task.id !== overdueTask.id);
    if (secondTask) {
      await db
        .update(orderTasks)
        .set({ dueAt: subDays(now, 2), status: "done" })
        .where(eq(orderTasks.id, secondTask.id));
    }

    // WIP, due far in the future (not "due this week"), docs all verified (not docs-pending).
    const dueLater = await makeOrder(
      "+919876611011",
      "ops-dashboard-test-marker stats-due-later",
      execCId,
    );
    await db
      .update(orders)
      .set({ dueAt: addDays(now, 20) })
      .where(eq(orders.id, dueLater.id));
    await db
      .update(documents)
      .set({ status: "verified" })
      .where(and(eq(documents.ownerType, "order"), eq(documents.ownerId, dueLater.id)));

    // Completed this month.
    const completedThisMonth = await makeOrder(
      "+919876611012",
      "ops-dashboard-test-marker stats-completed-this-month",
      execCId,
    );
    await db
      .update(orders)
      .set({ status: "completed", completedAt: now })
      .where(eq(orders.id, completedThisMonth.id));

    // Completed last month — counts toward completedTillDate but not completedThisMonth.
    const completedLastMonth = await makeOrder(
      "+919876611013",
      "ops-dashboard-test-marker stats-completed-last-month",
      execCId,
    );
    await db
      .update(orders)
      .set({ status: "completed", completedAt: subMonths(now, 1) })
      .where(eq(orders.id, completedLastMonth.id));

    // Cancelled — must not contribute to any stat.
    const cancelled = await makeOrder(
      "+919876611014",
      "ops-dashboard-test-marker stats-cancelled",
      execCId,
    );
    await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, cancelled.id));

    // Another executive's WIP order — must not leak into execC's stats.
    await makeOrder("+919876611015", "ops-dashboard-test-marker stats-other-exec", execAId);

    const stats = await getMyJobCardDashboardStats(execCId, now);

    expect(stats.totalJobCards).toBe(2); // dueSoon + dueLater
    expect(stats.overdueTasks).toBe(1); // only the one pending+overdue task on dueSoon
    expect(stats.docsPending).toBe(1); // dueSoon only (dueLater's docs were all verified)
    expect(stats.completedThisMonth).toBe(1);
    expect(stats.dueThisWeek).toBe(1); // dueSoon only
    expect(stats.completedTillDate).toBe(2); // completedThisMonth + completedLastMonth
  });
});
