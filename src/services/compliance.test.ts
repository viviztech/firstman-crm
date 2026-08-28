import { randomUUID } from "node:crypto";
import { addDays, addMonths, addYears, subDays } from "date-fns";
import { and, eq, ilike, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { services } from "@/db/schema/catalog";
import { clients } from "@/db/schema/clients";
import { complianceItems } from "@/db/schema/compliance";
import { documents } from "@/db/schema/documents";
import { states } from "@/db/schema/geography";
import { orders, orderTasks } from "@/db/schema/orders";
import { makeScope } from "@/lib/test-scope";
import {
  createComplianceItem,
  createOrderFromComplianceItem,
  deleteComplianceItem,
  getComplianceItem,
  getItemsDueInDays,
  listComplianceItems,
  listComplianceItemsForClient,
  listComplianceItemsForRange,
  listUpcomingComplianceItems,
  markComplianceItemFiled,
  rollComplianceStatuses,
  updateComplianceItem,
} from "@/services/compliance";

async function makeTestClient(phone: string, actorId: string, assignedTo?: string) {
  const [client] = await db
    .insert(clients)
    .values({
      type: "individual",
      name: "Compliance Test Client",
      phone,
      assignedTo,
      createdBy: actorId,
    })
    .returning();
  if (!client) throw new Error("Failed to create test client");
  return client;
}

describe("compliance service (integration)", () => {
  const managerId = randomUUID();
  const execAId = randomUUID();
  const execBId = randomUUID();
  const franchiseId = randomUUID();

  const managerScope = makeScope(managerId, "manager");
  const execAScope = makeScope(execAId, "executive");

  let pvtLtdServiceId: string;

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: managerId,
        name: "Compliance Test Manager",
        email: `compliance-manager-${managerId}@test.local`,
        emailVerified: true,
        role: "manager",
      },
      {
        id: execAId,
        name: "Compliance Test Exec A",
        email: `compliance-execA-${execAId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: execBId,
        name: "Compliance Test Exec B",
        email: `compliance-execB-${execBId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: franchiseId,
        name: "Compliance Test Franchise",
        email: `compliance-franchise-${franchiseId}@test.local`,
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
    const testClients = await db
      .select({ id: clients.id })
      .from(clients)
      .where(ilike(clients.phone, "+919876604%"));
    const clientIds = testClients.map((c) => c.id);

    if (clientIds.length > 0) {
      await db.delete(complianceItems).where(inArray(complianceItems.clientId, clientIds));

      const testOrders = await db
        .select({ id: orders.id })
        .from(orders)
        .where(inArray(orders.clientId, clientIds));
      const orderIds = testOrders.map((o) => o.id);
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

    await db.delete(clients).where(ilike(clients.phone, "+919876604%"));
    await db.delete(user).where(eq(user.id, managerId));
    await db.delete(user).where(eq(user.id, execAId));
    await db.delete(user).where(eq(user.id, execBId));
    await db.delete(user).where(eq(user.id, franchiseId));
  });

  describe("rollComplianceStatuses (time-frozen)", () => {
    it("marks past-due items overdue and items inside the T-15 window due_soon, leaving the rest untouched", async () => {
      const client = await makeTestClient("+919876604001", managerId);
      const now = new Date("2026-01-15T00:00:00.000Z");

      const overdueItem = await createComplianceItem(
        {
          clientId: client.id,
          title: "compliance-test-marker overdue item",
          dueDate: subDays(now, 3),
          recurrence: "none",
        },
        managerScope,
      );
      const dueSoonItem = await createComplianceItem(
        {
          clientId: client.id,
          title: "compliance-test-marker due-soon item",
          dueDate: addDays(now, 10),
          recurrence: "none",
        },
        managerScope,
      );
      const upcomingItem = await createComplianceItem(
        {
          clientId: client.id,
          title: "compliance-test-marker upcoming item",
          dueDate: addDays(now, 30),
          recurrence: "none",
        },
        managerScope,
      );
      if (!overdueItem || !dueSoonItem || !upcomingItem) throw new Error("setup failed");

      const result = await rollComplianceStatuses(now);
      expect(result.overdue).toBeGreaterThanOrEqual(1);
      expect(result.dueSoon).toBeGreaterThanOrEqual(1);

      const [overdueRow, dueSoonRow, upcomingRow] = await Promise.all([
        db.query.complianceItems.findFirst({ where: eq(complianceItems.id, overdueItem.id) }),
        db.query.complianceItems.findFirst({ where: eq(complianceItems.id, dueSoonItem.id) }),
        db.query.complianceItems.findFirst({ where: eq(complianceItems.id, upcomingItem.id) }),
      ]);
      expect(overdueRow?.status).toBe("overdue");
      expect(dueSoonRow?.status).toBe("due_soon");
      expect(upcomingRow?.status).toBe("upcoming");
    });

    it("never rolls a filed or n/a item back into overdue/due_soon, and is idempotent to re-run", async () => {
      const client = await makeTestClient("+919876604002", managerId);
      const now = new Date("2026-01-15T00:00:00.000Z");

      const filedItem = await createComplianceItem(
        {
          clientId: client.id,
          title: "compliance-test-marker filed item",
          dueDate: subDays(now, 5),
          recurrence: "none",
        },
        managerScope,
      );
      if (!filedItem) throw new Error("setup failed");
      await markComplianceItemFiled(filedItem.id, managerScope);

      await rollComplianceStatuses(now);
      const afterFirst = await db.query.complianceItems.findFirst({
        where: eq(complianceItems.id, filedItem.id),
      });
      expect(afterFirst?.status).toBe("filed");

      // Re-running must not change anything (idempotent).
      const second = await rollComplianceStatuses(now);
      const afterSecond = await db.query.complianceItems.findFirst({
        where: eq(complianceItems.id, filedItem.id),
      });
      expect(afterSecond?.status).toBe("filed");
      expect(second.overdue).toBe(0);
    });
  });

  describe("markComplianceItemFiled next-occurrence generation (time-frozen)", () => {
    it("does not generate a next occurrence for a one-time (recurrence: none) item", async () => {
      const client = await makeTestClient("+919876604003", managerId);
      const item = await createComplianceItem(
        {
          clientId: client.id,
          title: "compliance-test-marker one-time",
          dueDate: new Date("2026-02-01T00:00:00.000Z"),
          recurrence: "none",
        },
        managerScope,
      );
      if (!item) throw new Error("setup failed");

      const result = await markComplianceItemFiled(item.id, managerScope);
      expect(result?.filed.status).toBe("filed");
      expect(result?.filed.filedAt).toBeTruthy();
      expect(result?.nextItem).toBeNull();
    });

    it.each([
      ["monthly", addMonths] as const,
      ["quarterly", (d: Date) => addMonths(d, 3)] as const,
      ["yearly", addYears] as const,
    ])("generates the correct next occurrence for %s recurrence", async (recurrence, addFn) => {
      const client = await makeTestClient(
        `+919876604${recurrence === "monthly" ? "004" : recurrence === "quarterly" ? "005" : "006"}`,
        managerId,
      );
      const dueDate = new Date("2026-03-10T00:00:00.000Z");
      const item = await createComplianceItem(
        {
          clientId: client.id,
          title: `compliance-test-marker ${recurrence}`,
          dueDate,
          recurrence: recurrence as "monthly" | "quarterly" | "yearly",
        },
        managerScope,
      );
      if (!item) throw new Error("setup failed");

      const result = await markComplianceItemFiled(item.id, managerScope);
      expect(result?.nextItem).toBeTruthy();
      expect(result?.nextItem?.status).toBe("upcoming");
      expect(result?.nextItem?.recurrence).toBe(recurrence);
      expect(result?.nextItem?.dueDate.getTime()).toBe(addFn(dueDate, 1).getTime());
    });

    it("returns null when marking an already-filed item filed again", async () => {
      const client = await makeTestClient("+919876604007", managerId);
      const item = await createComplianceItem(
        {
          clientId: client.id,
          title: "compliance-test-marker double-file",
          dueDate: new Date("2026-04-01T00:00:00.000Z"),
          recurrence: "none",
        },
        managerScope,
      );
      if (!item) throw new Error("setup failed");

      await markComplianceItemFiled(item.id, managerScope);
      const second = await markComplianceItemFiled(item.id, managerScope);
      expect(second).toBeNull();
    });
  });

  describe("getItemsDueInDays (time-frozen)", () => {
    it("returns only items due exactly N days ahead, excluding filed/na", async () => {
      const client = await makeTestClient("+919876604008", managerId);
      const now = new Date("2026-05-01T00:00:00.000Z");

      const dueAt15 = await createComplianceItem(
        {
          clientId: client.id,
          title: "compliance-test-marker due-in-15",
          dueDate: addDays(now, 15),
          recurrence: "none",
        },
        managerScope,
      );
      const dueAt7 = await createComplianceItem(
        {
          clientId: client.id,
          title: "compliance-test-marker due-in-7",
          dueDate: addDays(now, 7),
          recurrence: "none",
        },
        managerScope,
      );
      if (!dueAt15 || !dueAt7) throw new Error("setup failed");

      const filedAt15 = await createComplianceItem(
        {
          clientId: client.id,
          title: "compliance-test-marker due-in-15-filed",
          dueDate: addDays(now, 15),
          recurrence: "none",
        },
        managerScope,
      );
      if (!filedAt15) throw new Error("setup failed");
      await markComplianceItemFiled(filedAt15.id, managerScope);

      const results15 = await getItemsDueInDays(15, now);
      const ids15 = results15.map((r) => r.id);
      expect(ids15).toContain(dueAt15.id);
      expect(ids15).not.toContain(dueAt7.id);
      expect(ids15).not.toContain(filedAt15.id);

      const results7 = await getItemsDueInDays(7, now);
      expect(results7.map((r) => r.id)).toContain(dueAt7.id);
    });
  });

  describe("executive scoping", () => {
    it("lets an executive create and list only compliance items for clients assigned to them", async () => {
      const clientForA = await makeTestClient("+919876604009", managerId, execAId);
      const clientForB = await makeTestClient("+919876604010", managerId, execBId);

      const itemForA = await createComplianceItem(
        {
          clientId: clientForA.id,
          title: "compliance-test-marker scoped A",
          dueDate: new Date("2026-06-01T00:00:00.000Z"),
          recurrence: "none",
        },
        execAScope,
      );
      if (!itemForA) throw new Error("setup failed");

      const blocked = await createComplianceItem(
        {
          clientId: clientForB.id,
          title: "compliance-test-marker blocked",
          dueDate: new Date("2026-06-01T00:00:00.000Z"),
          recurrence: "none",
        },
        execAScope,
      );
      expect(blocked).toBeNull();

      const itemForB = await createComplianceItem(
        {
          clientId: clientForB.id,
          title: "compliance-test-marker scoped B",
          dueDate: new Date("2026-06-01T00:00:00.000Z"),
          recurrence: "none",
        },
        managerScope,
      );
      if (!itemForB) throw new Error("setup failed");

      const aList = await listComplianceItems(execAScope, { search: "compliance-test-marker" });
      expect(aList.rows.map((r) => r.id)).toContain(itemForA.id);
      expect(aList.rows.map((r) => r.id)).not.toContain(itemForB.id);
    });

    it("lets a state-level franchise executive create and fetch compliance items for any client in the state (regression: previously only area-level franchises worked)", async () => {
      const karnataka = await db.query.states.findFirst({ where: eq(states.name, "Karnataka") });
      if (!karnataka) throw new Error("Seed geography first — Karnataka not found");

      const franchiseScope = makeScope(franchiseId, "executive", {
        employeeType: "franchise",
        franchiseTerritory: {
          id: randomUUID(),
          level: "state",
          stateId: karnataka.id,
          parliamentaryConstituencyId: null,
          assemblyConstituencyId: null,
          pincode: null,
        },
      });

      const [client] = await db
        .insert(clients)
        .values({
          type: "individual",
          name: "Compliance Test Franchise Client",
          phone: "+919876604099",
          pincode: "560001",
          createdBy: managerId,
        })
        .returning();
      if (!client) throw new Error("Failed to create test client");

      const item = await createComplianceItem(
        {
          clientId: client.id,
          title: "compliance-test-marker franchise state",
          dueDate: new Date("2026-06-01T00:00:00.000Z"),
          recurrence: "none",
        },
        franchiseScope,
      );
      expect(item).not.toBeNull();

      expect(await getComplianceItem(item?.id as string, franchiseScope)).toBeTruthy();
    });
  });

  describe("list queries", () => {
    it("listComplianceItemsForRange returns only items due within [from, to], scoped", async () => {
      const client = await makeTestClient("+919876604011", managerId);
      const inRange = await createComplianceItem(
        {
          clientId: client.id,
          title: "compliance-test-marker in-range",
          dueDate: new Date("2026-07-10T00:00:00.000Z"),
          recurrence: "none",
        },
        managerScope,
      );
      const outOfRange = await createComplianceItem(
        {
          clientId: client.id,
          title: "compliance-test-marker out-of-range",
          dueDate: new Date("2026-09-10T00:00:00.000Z"),
          recurrence: "none",
        },
        managerScope,
      );
      if (!inRange || !outOfRange) throw new Error("setup failed");

      const rows = await listComplianceItemsForRange(
        managerScope,
        new Date("2026-07-01T00:00:00.000Z"),
        new Date("2026-07-31T00:00:00.000Z"),
      );
      const ids = rows.map((r) => r.id);
      expect(ids).toContain(inRange.id);
      expect(ids).not.toContain(outOfRange.id);
    });

    it("listUpcomingComplianceItems excludes filed items and items beyond the window", async () => {
      const client = await makeTestClient("+919876604012", managerId);
      const soon = await createComplianceItem(
        {
          clientId: client.id,
          title: "compliance-test-marker upcoming-soon",
          dueDate: addDays(new Date(), 3),
          recurrence: "none",
        },
        managerScope,
      );
      const far = await createComplianceItem(
        {
          clientId: client.id,
          title: "compliance-test-marker upcoming-far",
          dueDate: addDays(new Date(), 60),
          recurrence: "none",
        },
        managerScope,
      );
      if (!soon || !far) throw new Error("setup failed");

      const rows = await listUpcomingComplianceItems(managerScope, 14);
      const ids = rows.map((r) => r.id);
      expect(ids).toContain(soon.id);
      expect(ids).not.toContain(far.id);
    });
  });

  describe("createOrderFromComplianceItem", () => {
    it("creates an order from a service-linked item and links it back", async () => {
      const client = await makeTestClient("+919876604013", managerId);
      const item = await createComplianceItem(
        {
          clientId: client.id,
          serviceId: pvtLtdServiceId,
          title: "compliance-test-marker create-order",
          dueDate: new Date("2026-08-01T00:00:00.000Z"),
          recurrence: "none",
        },
        managerScope,
      );
      if (!item) throw new Error("setup failed");

      const order = await createOrderFromComplianceItem(item.id, managerScope);
      expect(order?.clientId).toBe(client.id);
      expect(order?.serviceId).toBe(pvtLtdServiceId);

      const updatedItem = await db.query.complianceItems.findFirst({
        where: eq(complianceItems.id, item.id),
      });
      expect(updatedItem?.orderId).toBe(order?.id);
    });

    it("throws when the compliance item has no linked service", async () => {
      const client = await makeTestClient("+919876604014", managerId);
      const item = await createComplianceItem(
        {
          clientId: client.id,
          title: "compliance-test-marker no-service",
          dueDate: new Date("2026-08-01T00:00:00.000Z"),
          recurrence: "none",
        },
        managerScope,
      );
      if (!item) throw new Error("setup failed");

      await expect(createOrderFromComplianceItem(item.id, managerScope)).rejects.toThrow();
    });
  });

  describe("deleteComplianceItem", () => {
    it("soft-deletes so the item drops out of scoped list/range queries", async () => {
      const client = await makeTestClient("+919876604015", managerId);
      const item = await createComplianceItem(
        {
          clientId: client.id,
          title: "compliance-test-marker delete-me",
          dueDate: new Date("2026-08-15T00:00:00.000Z"),
          recurrence: "none",
        },
        managerScope,
      );
      if (!item) throw new Error("setup failed");

      const deleted = await deleteComplianceItem(item.id, managerScope);
      expect(deleted?.deletedAt).toBeTruthy();

      const rows = await listComplianceItemsForRange(
        managerScope,
        new Date("2026-08-01T00:00:00.000Z"),
        new Date("2026-08-31T00:00:00.000Z"),
      );
      expect(rows.map((r) => r.id)).not.toContain(item.id);
    });

    it("returns null for an item that doesn't exist or is already deleted", async () => {
      expect(await deleteComplianceItem(randomUUID(), managerScope)).toBeNull();
    });
  });

  describe("getComplianceItem", () => {
    it("returns undefined for a missing item and for one an executive isn't scoped to", async () => {
      expect(await getComplianceItem(randomUUID(), managerScope)).toBeUndefined();

      const clientForB = await makeTestClient("+919876604016", managerId, execBId);
      const item = await createComplianceItem(
        {
          clientId: clientForB.id,
          title: "compliance-test-marker get-scoped",
          dueDate: new Date("2026-08-20T00:00:00.000Z"),
          recurrence: "none",
        },
        managerScope,
      );
      if (!item) throw new Error("setup failed");

      expect(await getComplianceItem(item.id, execAScope)).toBeUndefined();
      expect(await getComplianceItem(item.id, managerScope)).toBeTruthy();
    });
  });

  describe("listComplianceItemsForClient", () => {
    it("returns an empty list for an executive not assigned to the client", async () => {
      const clientForB = await makeTestClient("+919876604017", managerId, execBId);
      await createComplianceItem(
        {
          clientId: clientForB.id,
          title: "compliance-test-marker client-tab-scoped",
          dueDate: new Date("2026-08-25T00:00:00.000Z"),
          recurrence: "none",
        },
        managerScope,
      );

      const asBlockedExec = await listComplianceItemsForClient(clientForB.id, execAScope);
      expect(asBlockedExec).toEqual([]);

      const asManager = await listComplianceItemsForClient(clientForB.id, managerScope);
      expect(asManager.length).toBeGreaterThan(0);
    });
  });

  describe("updateComplianceItem", () => {
    it("updates editable fields and returns null for a missing item or a blocked executive", async () => {
      const client = await makeTestClient("+919876604018", managerId);
      const item = await createComplianceItem(
        {
          clientId: client.id,
          title: "compliance-test-marker before-edit",
          dueDate: new Date("2026-09-01T00:00:00.000Z"),
          recurrence: "none",
        },
        managerScope,
      );
      if (!item) throw new Error("setup failed");

      const updated = await updateComplianceItem(
        item.id,
        {
          title: "compliance-test-marker after-edit",
          dueDate: new Date("2026-09-05T00:00:00.000Z"),
          recurrence: "monthly",
        },
        managerScope,
      );
      expect(updated?.title).toBe("compliance-test-marker after-edit");
      expect(updated?.recurrence).toBe("monthly");

      expect(
        await updateComplianceItem(
          randomUUID(),
          { title: "nope", dueDate: new Date(), recurrence: "none" },
          managerScope,
        ),
      ).toBeNull();

      const clientForB = await makeTestClient("+919876604019", managerId, execBId);
      const itemForB = await createComplianceItem(
        {
          clientId: clientForB.id,
          title: "compliance-test-marker blocked-edit",
          dueDate: new Date("2026-09-10T00:00:00.000Z"),
          recurrence: "none",
        },
        managerScope,
      );
      if (!itemForB) throw new Error("setup failed");

      expect(
        await updateComplianceItem(
          itemForB.id,
          { title: "nope", dueDate: new Date(), recurrence: "none" },
          execAScope,
        ),
      ).toBeNull();
    });
  });

  describe("markComplianceItemFiled scoping", () => {
    it("blocks an executive from filing an item for a client they aren't assigned to", async () => {
      const clientForB = await makeTestClient("+919876604020", managerId, execBId);
      const item = await createComplianceItem(
        {
          clientId: clientForB.id,
          title: "compliance-test-marker blocked-file",
          dueDate: new Date("2026-09-15T00:00:00.000Z"),
          recurrence: "none",
        },
        managerScope,
      );
      if (!item) throw new Error("setup failed");

      expect(await markComplianceItemFiled(item.id, execAScope)).toBeNull();
    });
  });

  describe("more list query branches", () => {
    it("listComplianceItems filters by status", async () => {
      const client = await makeTestClient("+919876604021", managerId);
      const item = await createComplianceItem(
        {
          clientId: client.id,
          title: "compliance-test-marker status-filter",
          dueDate: new Date("2026-01-01T00:00:00.000Z"),
          recurrence: "none",
        },
        managerScope,
      );
      if (!item) throw new Error("setup failed");
      await markComplianceItemFiled(item.id, managerScope);

      const filed = await listComplianceItems(managerScope, {
        search: "compliance-test-marker status-filter",
        status: "filed",
      });
      expect(filed.rows.map((r) => r.id)).toContain(item.id);

      const overdue = await listComplianceItems(managerScope, {
        search: "compliance-test-marker status-filter",
        status: "overdue",
      });
      expect(overdue.rows.map((r) => r.id)).not.toContain(item.id);
    });

    it("scopes listComplianceItemsForRange and listUpcomingComplianceItems to an executive's clients", async () => {
      const clientForA = await makeTestClient("+919876604022", managerId, execAId);
      const clientForB = await makeTestClient("+919876604023", managerId, execBId);

      const itemForA = await createComplianceItem(
        {
          clientId: clientForA.id,
          title: "compliance-test-marker range-scoped-A",
          dueDate: addDays(new Date(), 5),
          recurrence: "none",
        },
        managerScope,
      );
      const itemForB = await createComplianceItem(
        {
          clientId: clientForB.id,
          title: "compliance-test-marker range-scoped-B",
          dueDate: addDays(new Date(), 5),
          recurrence: "none",
        },
        managerScope,
      );
      if (!itemForA || !itemForB) throw new Error("setup failed");

      const rangeRows = await listComplianceItemsForRange(
        execAScope,
        addDays(new Date(), -1),
        addDays(new Date(), 10),
      );
      expect(rangeRows.map((r) => r.id)).toContain(itemForA.id);
      expect(rangeRows.map((r) => r.id)).not.toContain(itemForB.id);

      const upcomingRows = await listUpcomingComplianceItems(execAScope, 14);
      expect(upcomingRows.map((r) => r.id)).toContain(itemForA.id);
      expect(upcomingRows.map((r) => r.id)).not.toContain(itemForB.id);
    });
  });

  describe("createOrderFromComplianceItem scoping and errors", () => {
    it("returns null for a missing item, blocks an unscoped executive, and self-assigns an executive-created order", async () => {
      expect(await createOrderFromComplianceItem(randomUUID(), managerScope)).toBeNull();

      const clientForB = await makeTestClient("+919876604024", managerId, execBId);
      const itemForB = await createComplianceItem(
        {
          clientId: clientForB.id,
          serviceId: pvtLtdServiceId,
          title: "compliance-test-marker order-blocked",
          dueDate: new Date("2026-10-01T00:00:00.000Z"),
          recurrence: "none",
        },
        managerScope,
      );
      if (!itemForB) throw new Error("setup failed");
      expect(await createOrderFromComplianceItem(itemForB.id, execAScope)).toBeNull();

      const clientForA = await makeTestClient("+919876604025", managerId, execAId);
      const itemForA = await createComplianceItem(
        {
          clientId: clientForA.id,
          serviceId: pvtLtdServiceId,
          title: "compliance-test-marker order-self-assign",
          dueDate: new Date("2026-10-05T00:00:00.000Z"),
          recurrence: "none",
        },
        managerScope,
      );
      if (!itemForA) throw new Error("setup failed");

      const order = await createOrderFromComplianceItem(itemForA.id, execAScope);
      expect(order?.assignedTo).toBe(execAId);
    });
  });
});
