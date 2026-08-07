import { randomUUID } from "node:crypto";
import { and, eq, ilike, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { serviceCategories, services } from "@/db/schema/catalog";
import { clients } from "@/db/schema/clients";
import { documents } from "@/db/schema/documents";
import { enquiries } from "@/db/schema/enquiries";
import { invoices, payments } from "@/db/schema/invoices";
import { orders, orderTasks } from "@/db/schema/orders";
import { makeScope } from "@/lib/test-scope";
import {
  getEnquiriesThisMonthByStatus,
  getMyOpenTasks,
  getMyOrdersInProgress,
  getOrdersByStatusCounts,
  getOverdueTasks,
  getRevenueThisMonthVsLast,
  getTopServicesByRevenue,
} from "@/services/analytics";
import { createEnquiry } from "@/services/enquiries";
import { createInvoice, recordPayment, sendInvoice } from "@/services/invoices";
import { createOrder, updateOrderStatus } from "@/services/orders";

async function makeTestClient(phone: string, actorId: string) {
  const [client] = await db
    .insert(clients)
    .values({ type: "individual", name: "Analytics Test Client", phone, createdBy: actorId })
    .returning();
  if (!client) throw new Error("Failed to create test client");
  return client;
}

describe("analytics service (integration)", () => {
  const managerId = randomUUID();
  const execAId = randomUUID();
  const execBId = randomUUID();

  const managerScope = makeScope(managerId, "manager");
  const execAScope = makeScope(execAId, "executive");

  let pvtLtdServiceId: string;
  let dedicatedServiceId: string;
  let dedicatedCategoryId: string;

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: managerId,
        name: "Analytics Test Manager",
        email: `analytics-manager-${managerId}@test.local`,
        emailVerified: true,
        role: "manager",
      },
      {
        id: execAId,
        name: "Analytics Test Exec A",
        email: `analytics-execA-${execAId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: execBId,
        name: "Analytics Test Exec B",
        email: `analytics-execB-${execBId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
    ]);

    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration service not found");
    pvtLtdServiceId = service.id;

    // A private service (not the shared seeded catalog) for the top-services-by-revenue test,
    // which does an exact-sum assertion that would otherwise race other test files' orders
    // against the shared pvt-ltd-registration service.
    const [category] = await db
      .insert(serviceCategories)
      .values({ name: `Analytics Test Category ${randomUUID().slice(0, 8)}` })
      .returning();
    if (!category) throw new Error("Failed to create test service category");
    dedicatedCategoryId = category.id;

    const [dedicatedService] = await db
      .insert(services)
      .values({
        categoryId: category.id,
        name: "Analytics Test Service",
        slug: `analytics-test-service-${randomUUID().slice(0, 8)}`,
        basePricePaise: 100000,
        estimatedDays: 7,
        checklistTemplate: [],
        requiredDocuments: [],
      })
      .returning();
    if (!dedicatedService) throw new Error("Failed to create test service");
    dedicatedServiceId = dedicatedService.id;
  });

  afterAll(async () => {
    const testClients = await db
      .select({ id: clients.id })
      .from(clients)
      .where(ilike(clients.phone, "+919876614%"));
    const clientIds = testClients.map((c) => c.id);

    if (clientIds.length > 0) {
      const testOrders = await db
        .select({ id: orders.id })
        .from(orders)
        .where(inArray(orders.clientId, clientIds));
      const orderIds = testOrders.map((o) => o.id);
      const testInvoices = await db
        .select({ id: invoices.id })
        .from(invoices)
        .where(inArray(invoices.clientId, clientIds));
      const invoiceIds = testInvoices.map((i) => i.id);

      if (invoiceIds.length > 0) {
        await db.delete(payments).where(inArray(payments.invoiceId, invoiceIds));
        await db.delete(invoices).where(inArray(invoices.id, invoiceIds));
      }
      for (const id of orderIds) {
        await db.delete(orderTasks).where(eq(orderTasks.orderId, id));
        await db
          .delete(documents)
          .where(and(eq(documents.ownerType, "order"), eq(documents.ownerId, id)));
      }
      if (orderIds.length > 0) {
        await db.delete(orders).where(inArray(orders.id, orderIds));
      }
    }

    await db.delete(clients).where(ilike(clients.phone, "+919876614%"));
    await db.delete(enquiries).where(ilike(enquiries.phone, "+919876614%"));
    await db.delete(services).where(eq(services.id, dedicatedServiceId));
    await db.delete(serviceCategories).where(eq(serviceCategories.id, dedicatedCategoryId));
    await db.delete(user).where(eq(user.id, managerId));
    await db.delete(user).where(eq(user.id, execAId));
    await db.delete(user).where(eq(user.id, execBId));
  });

  describe("getEnquiriesThisMonthByStatus", () => {
    it("counts enquiries created in the given month by status, scoped to the executive when applicable", async () => {
      const now = new Date();

      await createEnquiry(
        {
          name: "Analytics Enquiry A",
          phone: "+919876614001",
          source: "website",
          assignedTo: execAId,
        },
        managerScope,
      );
      await createEnquiry(
        {
          name: "Analytics Enquiry B",
          phone: "+919876614002",
          source: "website",
          assignedTo: execBId,
        },
        managerScope,
      );

      const managerRows = await getEnquiriesThisMonthByStatus(managerScope, now);
      const newCount = managerRows.find((row) => row.status === "new")?.count ?? 0;
      expect(newCount).toBeGreaterThanOrEqual(2);

      const execRows = await getEnquiriesThisMonthByStatus(execAScope, now);
      const execNewCount = execRows.find((row) => row.status === "new")?.count ?? 0;
      expect(execNewCount).toBeGreaterThanOrEqual(1);
      expect(execNewCount).toBeLessThan(newCount);
    });
  });

  describe("getRevenueThisMonthVsLast", () => {
    it("sums payments paid this month separately from last month", async () => {
      const client = await makeTestClient("+919876614003", managerId);
      const invoice = await createInvoice(
        {
          clientId: client.id,
          lineItems: [{ description: "analytics-test-marker", qty: 1, ratePaise: 500000 }],
          gstRate: 0,
          dueDate: new Date("2026-09-01T00:00:00.000Z"),
        },
        managerScope,
      );
      if (!invoice) throw new Error("setup failed");
      await sendInvoice(invoice.id, managerScope);
      await recordPayment(invoice.id, { amountPaise: 500000, method: "cash" }, managerScope);

      const revenue = await getRevenueThisMonthVsLast(new Date());
      expect(revenue.thisMonthPaise).toBeGreaterThanOrEqual(500000);
    });
  });

  describe("getOrdersByStatusCounts", () => {
    it("counts orders by status, scoped to the executive when applicable", async () => {
      const client = await makeTestClient("+919876614004", managerId);
      const orderForA = await createOrder(
        {
          clientId: client.id,
          serviceId: pvtLtdServiceId,
          quotedPricePaise: 100000,
          assignedTo: execAId,
          notes: "analytics-test-marker status counts",
        },
        managerScope,
      );
      await updateOrderStatus(orderForA.id, "on_hold", managerScope);

      const managerRows = await getOrdersByStatusCounts(managerScope);
      expect(managerRows.find((row) => row.status === "on_hold")?.count).toBeGreaterThanOrEqual(1);

      const execRows = await getOrdersByStatusCounts(execAScope);
      expect(execRows.find((row) => row.status === "on_hold")?.count).toBeGreaterThanOrEqual(1);
    });
  });

  describe("getOverdueTasks", () => {
    it("returns tasks past their due date and not done, scoped to the executive when applicable", async () => {
      const client = await makeTestClient("+919876614005", managerId);
      const order = await createOrder(
        {
          clientId: client.id,
          serviceId: pvtLtdServiceId,
          quotedPricePaise: 100000,
          assignedTo: execAId,
          notes: "analytics-test-marker overdue task",
        },
        managerScope,
      );
      const task = await db.query.orderTasks.findFirst({ where: eq(orderTasks.orderId, order.id) });
      if (!task) throw new Error("expected a generated task");
      await db
        .update(orderTasks)
        .set({ dueAt: new Date("2020-01-01T00:00:00.000Z") })
        .where(eq(orderTasks.id, task.id));

      const now = new Date("2026-06-15T00:00:00.000Z");
      const managerOverdue = await getOverdueTasks(managerScope, 20, now);
      expect(managerOverdue.map((t) => t.id)).toContain(task.id);

      const execOverdue = await getOverdueTasks(execAScope, 20, now);
      expect(execOverdue.map((t) => t.id)).toContain(task.id);
    });
  });

  describe("getTopServicesByRevenue", () => {
    it("sums quoted revenue per service and excludes cancelled orders", async () => {
      const client = await makeTestClient("+919876614006", managerId);

      const activeOrder = await createOrder(
        {
          clientId: client.id,
          serviceId: dedicatedServiceId,
          quotedPricePaise: 250000,
          notes: "analytics-test-marker top-services-active",
        },
        managerScope,
      );
      const cancelledOrder = await createOrder(
        {
          clientId: client.id,
          serviceId: dedicatedServiceId,
          quotedPricePaise: 999999,
          notes: "analytics-test-marker top-services-cancelled",
        },
        managerScope,
      );
      await updateOrderStatus(cancelledOrder.id, "cancelled", managerScope);

      const rows = await getTopServicesByRevenue(managerScope, 1000);
      const row = rows.find((r) => r.serviceId === dedicatedServiceId);
      expect(row?.totalPaise).toBe(activeOrder.quotedPricePaise);
    });
  });

  describe("getMyOpenTasks and getMyOrdersInProgress", () => {
    it("returns only the given executive's open tasks and in-progress orders", async () => {
      const client = await makeTestClient("+919876614007", managerId);
      const order = await createOrder(
        {
          clientId: client.id,
          serviceId: pvtLtdServiceId,
          quotedPricePaise: 100000,
          assignedTo: execAId,
          notes: "analytics-test-marker my-tasks",
        },
        managerScope,
      );
      await updateOrderStatus(order.id, "in_progress", managerScope);

      const myTasks = await getMyOpenTasks(execAId, 20);
      expect(myTasks.some((task) => task.order.id === order.id)).toBe(true);

      const myOrders = await getMyOrdersInProgress(execAId, 20);
      expect(myOrders.map((o) => o.id)).toContain(order.id);

      const otherExecOrders = await getMyOrdersInProgress(execBId, 20);
      expect(otherExecOrders.map((o) => o.id)).not.toContain(order.id);
    });
  });
});
