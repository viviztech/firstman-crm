import { and, count, eq, ilike, inArray, isNull, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { services } from "@/db/schema/catalog";
import { documents } from "@/db/schema/documents";
import { orderStatusEnum, orders, orderTaskStatusEnum, orderTasks } from "@/db/schema/orders";
import { inferDocumentKind } from "@/lib/document-kind";
import type { ActorScope } from "@/lib/scope";
import { optionalDateTime, optionalTrimmed } from "@/lib/validation/helpers";
import { recordActivity } from "@/services/activity-log";
import { listDocumentsForOwner } from "@/services/documents";
import { getSettingForUpdate, setSetting } from "@/services/settings";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 20;

export const orderInputSchema = z.object({
  clientId: z.string().uuid("Choose a client"),
  serviceId: z.string().uuid("Choose a service"),
  quotedPricePaise: z.coerce.number().int().nonnegative(),
  govtFeePaise: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().int().nonnegative().optional(),
  ),
  assignedTo: optionalTrimmed(),
  startedAt: optionalDateTime,
  notes: optionalTrimmed(2000),
});

export type OrderInput = z.infer<typeof orderInputSchema>;

/** Edits after creation never change the client/service/start date the tasks were generated from. */
export const orderEditSchema = z.object({
  quotedPricePaise: z.coerce.number().int().nonnegative(),
  govtFeePaise: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().int().nonnegative().optional(),
  ),
  assignedTo: optionalTrimmed(),
  notes: optionalTrimmed(2000),
});

export type OrderEditInput = z.infer<typeof orderEditSchema>;

export const orderStatusUpdateSchema = z.object({
  status: z.enum(orderStatusEnum.enumValues),
});

export const orderTaskStatusUpdateSchema = z.object({
  status: z.enum(orderTaskStatusEnum.enumValues),
});

function scopeCondition(scope: ActorScope) {
  return scope.role === "executive" ? eq(orders.assignedTo, scope.userId) : undefined;
}

function enforceAssignment(assignedTo: string | undefined, actor: ActorScope) {
  return actor.role === "executive" ? actor.userId : assignedTo;
}

async function generateOrderNo(tx: Transaction, actor: ActorScope): Promise<string> {
  const year = new Date().getFullYear();
  const key = `orderNumberSeq:${year}`;
  const last = await getSettingForUpdate<number>(key, 0, tx);
  const next = last + 1;
  await setSetting(key, next, actor, tx);
  return `FM-${year}-${String(next).padStart(4, "0")}`;
}

/** Orders (in `orderIds`) with at least one non-verified document, for the list's "docs pending" badge. */
export async function getDocsPendingOrderIds(orderIds: string[]): Promise<Set<string>> {
  if (orderIds.length === 0) return new Set();

  const rows = await db
    .selectDistinct({ ownerId: documents.ownerId })
    .from(documents)
    .where(
      and(
        eq(documents.ownerType, "order"),
        inArray(documents.ownerId, orderIds),
        ne(documents.status, "verified"),
      ),
    );

  return new Set(rows.map((row) => row.ownerId));
}

export async function listOrders(
  scope: ActorScope,
  opts: { page?: number; search?: string; status?: string } = {},
) {
  const page = Math.max(1, opts.page ?? 1);
  const conditions = [isNull(orders.deletedAt)];
  const scoped = scopeCondition(scope);
  if (scoped) conditions.push(scoped);
  if (opts.search) {
    const term = `%${opts.search}%`;
    const searchCondition = or(ilike(orders.orderNo, term));
    if (searchCondition) conditions.push(searchCondition);
  }
  if (opts.status) {
    conditions.push(eq(orders.status, opts.status as (typeof orderStatusEnum.enumValues)[number]));
  }
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db.query.orders.findMany({
      where,
      orderBy: (order, { desc }) => [desc(order.createdAt)],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      with: {
        client: { columns: { id: true, name: true } },
        service: { columns: { id: true, name: true } },
        assignee: { columns: { id: true, name: true } },
      },
    }),
    db.select({ total: count() }).from(orders).where(where),
  ]);

  const docsPending = await getDocsPendingOrderIds(rows.map((row) => row.id));

  return {
    rows: rows.map((row) => ({ ...row, docsPending: docsPending.has(row.id) })),
    total: totalRows[0]?.total ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

/** Minimal {id, orderNo, clientId, clientName} list for select dropdowns (e.g. the invoice form's order picker). */
export async function listOrderOptions(scope: ActorScope) {
  const conditions = [isNull(orders.deletedAt)];
  const scoped = scopeCondition(scope);
  if (scoped) conditions.push(scoped);

  return db.query.orders.findMany({
    where: and(...conditions),
    orderBy: (order, { desc }) => [desc(order.createdAt)],
    columns: { id: true, orderNo: true, clientId: true },
    with: { client: { columns: { name: true } } },
  });
}

/** All of a client's orders, unpaginated — for the client profile's Orders tab. */
export async function listOrdersForClient(clientId: string, scope: ActorScope) {
  const conditions = [eq(orders.clientId, clientId), isNull(orders.deletedAt)];
  const scoped = scopeCondition(scope);
  if (scoped) conditions.push(scoped);

  return db.query.orders.findMany({
    where: and(...conditions),
    orderBy: (order, { desc }) => [desc(order.createdAt)],
    with: { service: { columns: { id: true, name: true } } },
  });
}

export async function getOrder(id: string, scope: ActorScope) {
  const conditions = [eq(orders.id, id), isNull(orders.deletedAt)];
  const scoped = scopeCondition(scope);
  if (scoped) conditions.push(scoped);

  const order = await db.query.orders.findFirst({
    where: and(...conditions),
    with: {
      client: { columns: { id: true, name: true, phone: true } },
      service: { columns: { id: true, name: true } },
      assignee: { columns: { id: true, name: true } },
      tasks: {
        where: (task, { isNull: isNullFn }) => isNullFn(task.deletedAt),
        orderBy: (task, { asc }) => [asc(task.sort)],
        with: { assignee: { columns: { id: true, name: true } } },
      },
    },
  });
  if (!order) return undefined;

  const orderDocuments = await listDocumentsForOwner("order", id);

  return { ...order, documents: orderDocuments };
}

/** Creates an order and, in the same transaction, generates its task checklist and document checklist (spec 4.4). */
export async function createOrder(input: OrderInput, actor: ActorScope) {
  return db.transaction(async (tx) => {
    const service = await tx.query.services.findFirst({ where: eq(services.id, input.serviceId) });
    if (!service) throw new Error("Service not found");

    const assignedTo = enforceAssignment(input.assignedTo, actor);
    const startedAt = input.startedAt ?? new Date();
    const dueAt = new Date(startedAt.getTime() + service.estimatedDays * DAY_MS);
    const orderNo = await generateOrderNo(tx, actor);

    const [order] = await tx
      .insert(orders)
      .values({
        orderNo,
        clientId: input.clientId,
        serviceId: input.serviceId,
        quotedPricePaise: input.quotedPricePaise,
        govtFeePaise: input.govtFeePaise,
        assignedTo,
        startedAt,
        dueAt,
        notes: input.notes,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .returning();
    if (!order) throw new Error("Failed to create order");

    if (service.checklistTemplate.length > 0) {
      await tx.insert(orderTasks).values(
        service.checklistTemplate.map((item, index) => ({
          orderId: order.id,
          title: item.title,
          assignedTo,
          dueAt: new Date(startedAt.getTime() + item.dayOffset * DAY_MS),
          sort: index,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        })),
      );
    }

    if (service.requiredDocuments.length > 0) {
      await tx.insert(documents).values(
        service.requiredDocuments.map((label) => ({
          ownerType: "order" as const,
          ownerId: order.id,
          kind: inferDocumentKind(label),
          label,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        })),
      );
    }

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "order",
        entityId: order.id,
        action: "created",
        diff: { orderNo, serviceId: input.serviceId, clientId: input.clientId },
      },
      tx,
    );

    return order;
  });
}

export async function updateOrder(id: string, input: OrderEditInput, actor: ActorScope) {
  const assignedTo = enforceAssignment(input.assignedTo, actor);

  return db.transaction(async (tx) => {
    const conditions = [eq(orders.id, id), isNull(orders.deletedAt)];
    const scoped = scopeCondition(actor);
    if (scoped) conditions.push(scoped);

    const [updated] = await tx
      .update(orders)
      .set({
        quotedPricePaise: input.quotedPricePaise,
        govtFeePaise: input.govtFeePaise,
        assignedTo,
        notes: input.notes,
        updatedBy: actor.userId,
      })
      .where(and(...conditions))
      .returning();
    if (!updated) return null;

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "order",
        entityId: updated.id,
        action: "updated",
        diff: input,
      },
      tx,
    );

    return updated;
  });
}

export async function updateOrderStatus(
  id: string,
  status: (typeof orderStatusEnum.enumValues)[number],
  actor: ActorScope,
) {
  return db.transaction(async (tx) => {
    const conditions = [eq(orders.id, id), isNull(orders.deletedAt)];
    const scoped = scopeCondition(actor);
    if (scoped) conditions.push(scoped);

    const [updated] = await tx
      .update(orders)
      .set({
        status,
        completedAt: status === "completed" ? new Date() : null,
        updatedBy: actor.userId,
      })
      .where(and(...conditions))
      .returning();
    if (!updated) return null;

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "order",
        entityId: updated.id,
        action: "status_changed",
        diff: { status },
      },
      tx,
    );

    return updated;
  });
}

export async function updateOrderTaskStatus(
  orderId: string,
  taskId: string,
  status: (typeof orderTaskStatusEnum.enumValues)[number],
  actor: ActorScope,
) {
  return db.transaction(async (tx) => {
    const orderConditions = [eq(orders.id, orderId), isNull(orders.deletedAt)];
    const scoped = scopeCondition(actor);
    if (scoped) orderConditions.push(scoped);

    const order = await tx.query.orders.findFirst({ where: and(...orderConditions) });
    if (!order) return null;

    const [updated] = await tx
      .update(orderTasks)
      .set({ status, updatedBy: actor.userId })
      .where(and(eq(orderTasks.id, taskId), eq(orderTasks.orderId, orderId)))
      .returning();
    if (!updated) return null;

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "order",
        entityId: orderId,
        action: "task_status_changed",
        diff: { taskId, status },
      },
      tx,
    );

    return updated;
  });
}

export async function deleteOrder(id: string, actor: ActorScope) {
  return db.transaction(async (tx) => {
    const [deleted] = await tx
      .update(orders)
      .set({ deletedAt: new Date(), updatedBy: actor.userId })
      .where(and(eq(orders.id, id), isNull(orders.deletedAt)))
      .returning();
    if (!deleted) return null;

    await recordActivity(
      { actorId: actor.userId, entityType: "order", entityId: deleted.id, action: "deleted" },
      tx,
    );

    return deleted;
  });
}
