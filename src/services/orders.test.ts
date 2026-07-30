import { randomUUID } from "node:crypto";
import { and, eq, ilike } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { services } from "@/db/schema/catalog";
import { clients } from "@/db/schema/clients";
import { documents } from "@/db/schema/documents";
import { orders, orderTasks } from "@/db/schema/orders";
import {
  createOrder,
  deleteOrder,
  getDocsPendingOrderIds,
  getOrder,
  listOrders,
  listOrdersForClient,
  orderEditSchema,
  orderInputSchema,
  updateOrder,
  updateOrderStatus,
  updateOrderTaskStatus,
} from "@/services/orders";

async function makeTestClient(phone: string, actorId: string) {
  const [client] = await db
    .insert(clients)
    .values({ type: "individual", name: "Order Test Client", phone, createdBy: actorId })
    .returning();
  if (!client) throw new Error("Failed to create test client");
  return client;
}

describe("orders service (integration)", () => {
  const managerId = randomUUID();
  const execAId = randomUUID();
  const execBId = randomUUID();

  const managerScope = { userId: managerId, role: "manager" as const };
  const execAScope = { userId: execAId, role: "executive" as const };
  const execBScope = { userId: execBId, role: "executive" as const };

  let pvtLtdServiceId: string;

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

    expect(order.orderNo).toMatch(/^FM-\d{4}-\d{4}$/);
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

    // dueAt = startedAt + service.estimatedDays (15 for Pvt Ltd Registration)
    const expectedDueAt = order.startedAt.getTime() + 15 * 24 * 60 * 60 * 1000;
    expect(order.dueAt.getTime()).toBe(expectedDueAt);
  });

  it("generates increasing, unique order numbers within the same year", async () => {
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

    // The sequence counter is a shared, lock-protected global (per year), so other test files
    // creating orders concurrently can interleave — assert monotonic increase, not exact +1.
    const firstSeq = Number(first.orderNo.split("-")[2]);
    const secondSeq = Number(second.orderNo.split("-")[2]);
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

  it("forces assignedTo to self when an executive creates an order", async () => {
    const client = await makeTestClient("+919876602004", managerId);
    const order = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        assignedTo: execBId,
        notes: "order-test-marker self-assign",
      },
      execAScope,
    );
    expect(order.assignedTo).toBe(execAId);
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
});
