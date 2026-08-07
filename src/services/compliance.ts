import { addDays, addMonths, addYears, endOfDay, startOfDay } from "date-fns";
import { and, asc, count, eq, gte, ilike, isNull, lte, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { services } from "@/db/schema/catalog";
import { clients } from "@/db/schema/clients";
import {
  complianceItems,
  complianceRecurrenceEnum,
  type complianceStatusEnum,
} from "@/db/schema/compliance";
import type { ActorScope } from "@/lib/scope";
import { visibilityConditions } from "@/lib/scope";
import { optionalTrimmed, optionalUuid } from "@/lib/validation/helpers";
import { recordActivity } from "@/services/activity-log";
import { createOrder } from "@/services/orders";

const PAGE_SIZE = 20;
const DUE_SOON_DAYS = 15;

export const complianceItemInputSchema = z.object({
  clientId: z.string().uuid("Choose a client"),
  serviceId: optionalUuid,
  title: z.string().trim().min(2, "Title is required").max(200),
  description: optionalTrimmed(1000),
  dueDate: z.coerce.date(),
  recurrence: z.enum(complianceRecurrenceEnum.enumValues),
});

export type ComplianceItemInput = z.infer<typeof complianceItemInputSchema>;

/** Edits never move an item to a different client — create a new one for that. */
export const complianceItemEditSchema = z.object({
  serviceId: optionalUuid,
  title: z.string().trim().min(2, "Title is required").max(200),
  description: optionalTrimmed(1000),
  dueDate: z.coerce.date(),
  recurrence: z.enum(complianceRecurrenceEnum.enumValues),
});

export type ComplianceItemEditInput = z.infer<typeof complianceItemEditSchema>;

type ComplianceRecurrence = (typeof complianceRecurrenceEnum.enumValues)[number];
type ComplianceStatus = (typeof complianceStatusEnum.enumValues)[number];

/**
 * Executives may only touch compliance items for a client in scope — internal-type by
 * assignedTo, franchise-type by pincode territory (spec 3, ADR 0001).
 */
async function canAccessClient(clientId: string, scope: ActorScope): Promise<boolean> {
  if (scope.role !== "executive") return true;
  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, clientId), isNull(clients.deletedAt)),
    columns: { assignedTo: true, pincode: true },
  });
  if (!client) return false;
  if (scope.employeeType === "franchise") {
    return (
      scope.pincodes.length > 0 &&
      client.pincode !== null &&
      scope.pincodes.includes(client.pincode)
    );
  }
  return client.assignedTo === scope.userId;
}

function computeNextDueDate(dueDate: Date, recurrence: ComplianceRecurrence): Date {
  switch (recurrence) {
    case "monthly":
      return addMonths(dueDate, 1);
    case "quarterly":
      return addMonths(dueDate, 3);
    case "yearly":
      return addYears(dueDate, 1);
    default:
      return dueDate;
  }
}

export async function listComplianceItems(
  scope: ActorScope,
  opts: { page?: number; search?: string; status?: string } = {},
) {
  const page = Math.max(1, opts.page ?? 1);
  const conditions = [isNull(complianceItems.deletedAt)];
  const scoped = visibilityConditions(scope, {
    assignedToColumn: clients.assignedTo,
    pincodeColumn: clients.pincode,
    serviceIdColumn: complianceItems.serviceId,
  });
  if (scoped) conditions.push(scoped);
  if (opts.search) {
    const term = `%${opts.search}%`;
    const searchCondition = or(ilike(complianceItems.title, term), ilike(clients.name, term));
    if (searchCondition) conditions.push(searchCondition);
  }
  if (opts.status) {
    conditions.push(eq(complianceItems.status, opts.status as ComplianceStatus));
  }
  const where = and(...conditions);

  const selection = {
    id: complianceItems.id,
    title: complianceItems.title,
    dueDate: complianceItems.dueDate,
    status: complianceItems.status,
    recurrence: complianceItems.recurrence,
    orderId: complianceItems.orderId,
    clientId: clients.id,
    clientName: clients.name,
  };

  const [rows, totalRows] = await Promise.all([
    db
      .select(selection)
      .from(complianceItems)
      .innerJoin(clients, eq(complianceItems.clientId, clients.id))
      .where(where)
      .orderBy(asc(complianceItems.dueDate))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(complianceItems)
      .innerJoin(clients, eq(complianceItems.clientId, clients.id))
      .where(where),
  ]);

  return { rows, total: totalRows[0]?.total ?? 0, page, pageSize: PAGE_SIZE };
}

/** For the calendar view — every item due within [from, to], scoped. */
export async function listComplianceItemsForRange(scope: ActorScope, from: Date, to: Date) {
  const conditions = [
    isNull(complianceItems.deletedAt),
    gte(complianceItems.dueDate, from),
    lte(complianceItems.dueDate, to),
  ];
  const scoped = visibilityConditions(scope, {
    assignedToColumn: clients.assignedTo,
    pincodeColumn: clients.pincode,
    serviceIdColumn: complianceItems.serviceId,
  });
  if (scoped) conditions.push(scoped);

  return db
    .select({
      id: complianceItems.id,
      title: complianceItems.title,
      dueDate: complianceItems.dueDate,
      status: complianceItems.status,
      clientId: clients.id,
      clientName: clients.name,
    })
    .from(complianceItems)
    .innerJoin(clients, eq(complianceItems.clientId, clients.id))
    .where(and(...conditions))
    .orderBy(asc(complianceItems.dueDate));
}

/** For the dashboard widget — items due in the next `days`, scoped, excluding filed/na. */
export async function listUpcomingComplianceItems(scope: ActorScope, days = 14) {
  const now = new Date();
  const until = addDays(now, days);
  const conditions = [
    isNull(complianceItems.deletedAt),
    ne(complianceItems.status, "filed"),
    ne(complianceItems.status, "na"),
    gte(complianceItems.dueDate, now),
    lte(complianceItems.dueDate, until),
  ];
  const scoped = visibilityConditions(scope, {
    assignedToColumn: clients.assignedTo,
    pincodeColumn: clients.pincode,
    serviceIdColumn: complianceItems.serviceId,
  });
  if (scoped) conditions.push(scoped);

  return db
    .select({
      id: complianceItems.id,
      title: complianceItems.title,
      dueDate: complianceItems.dueDate,
      status: complianceItems.status,
      clientId: clients.id,
      clientName: clients.name,
    })
    .from(complianceItems)
    .innerJoin(clients, eq(complianceItems.clientId, clients.id))
    .where(and(...conditions))
    .orderBy(asc(complianceItems.dueDate));
}

/** All of a client's compliance items — for the client profile's Compliance tab. */
export async function listComplianceItemsForClient(clientId: string, scope: ActorScope) {
  const allowed = await canAccessClient(clientId, scope);
  if (!allowed) return [];

  return db.query.complianceItems.findMany({
    where: and(eq(complianceItems.clientId, clientId), isNull(complianceItems.deletedAt)),
    orderBy: (item, { asc: ascFn }) => [ascFn(item.dueDate)],
    with: { service: { columns: { id: true, name: true } } },
  });
}

export async function getComplianceItem(id: string, scope: ActorScope) {
  const item = await db.query.complianceItems.findFirst({
    where: and(eq(complianceItems.id, id), isNull(complianceItems.deletedAt)),
    with: {
      client: { columns: { id: true, name: true, phone: true, assignedTo: true, pincode: true } },
      service: { columns: { id: true, name: true } },
      order: { columns: { id: true, orderNo: true } },
    },
  });
  if (!item) return undefined;
  if (scope.role === "executive") {
    const inTerritory =
      scope.employeeType === "franchise"
        ? scope.pincodes.length > 0 &&
          item.client.pincode !== null &&
          scope.pincodes.includes(item.client.pincode)
        : item.client.assignedTo === scope.userId;
    if (!inTerritory) return undefined;
    if (
      scope.serviceIds.length > 0 &&
      (!item.serviceId || !scope.serviceIds.includes(item.serviceId))
    ) {
      return undefined;
    }
  }
  return item;
}

export async function createComplianceItem(input: ComplianceItemInput, actor: ActorScope) {
  const allowed = await canAccessClient(input.clientId, actor);
  if (!allowed) return null;

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(complianceItems)
      .values({ ...input, createdBy: actor.userId, updatedBy: actor.userId })
      .returning();
    if (!created) throw new Error("Failed to create compliance item");

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "compliance_item",
        entityId: created.id,
        action: "created",
        diff: input,
      },
      tx,
    );

    return created;
  });
}

export async function updateComplianceItem(
  id: string,
  input: ComplianceItemEditInput,
  actor: ActorScope,
) {
  const existing = await db.query.complianceItems.findFirst({
    where: and(eq(complianceItems.id, id), isNull(complianceItems.deletedAt)),
  });
  if (!existing) return null;

  const allowed = await canAccessClient(existing.clientId, actor);
  if (!allowed) return null;

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(complianceItems)
      .set({ ...input, updatedBy: actor.userId })
      .where(eq(complianceItems.id, id))
      .returning();
    if (!updated) return null;

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "compliance_item",
        entityId: updated.id,
        action: "updated",
        diff: input,
      },
      tx,
    );

    return updated;
  });
}

/** Marks an item filed and, for recurring items, generates the next occurrence in the same transaction. */
export async function markComplianceItemFiled(id: string, actor: ActorScope) {
  const existing = await db.query.complianceItems.findFirst({
    where: and(eq(complianceItems.id, id), isNull(complianceItems.deletedAt)),
  });
  if (!existing || existing.status === "filed") return null;

  const allowed = await canAccessClient(existing.clientId, actor);
  if (!allowed) return null;

  return db.transaction(async (tx) => {
    const [filed] = await tx
      .update(complianceItems)
      .set({ status: "filed", filedAt: new Date(), updatedBy: actor.userId })
      .where(eq(complianceItems.id, id))
      .returning();
    if (!filed) throw new Error("Failed to mark compliance item filed");

    await recordActivity(
      { actorId: actor.userId, entityType: "compliance_item", entityId: filed.id, action: "filed" },
      tx,
    );

    if (existing.recurrence === "none") {
      return { filed, nextItem: null };
    }

    const [nextItem] = await tx
      .insert(complianceItems)
      .values({
        clientId: existing.clientId,
        serviceId: existing.serviceId,
        title: existing.title,
        description: existing.description,
        dueDate: computeNextDueDate(existing.dueDate, existing.recurrence),
        recurrence: existing.recurrence,
        status: "upcoming",
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .returning();
    if (!nextItem) throw new Error("Failed to generate next occurrence");

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "compliance_item",
        entityId: nextItem.id,
        action: "next_occurrence_generated",
        diff: { previousItemId: filed.id },
      },
      tx,
    );

    return { filed, nextItem };
  });
}

export async function deleteComplianceItem(id: string, actor: ActorScope) {
  return db.transaction(async (tx) => {
    const [deleted] = await tx
      .update(complianceItems)
      .set({ deletedAt: new Date(), updatedBy: actor.userId })
      .where(and(eq(complianceItems.id, id), isNull(complianceItems.deletedAt)))
      .returning();
    if (!deleted) return null;

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "compliance_item",
        entityId: deleted.id,
        action: "deleted",
      },
      tx,
    );

    return deleted;
  });
}

/** One-click order creation from a compliance item that's linked to a catalog service (spec 4.6). */
export async function createOrderFromComplianceItem(id: string, actor: ActorScope) {
  const item = await db.query.complianceItems.findFirst({
    where: and(eq(complianceItems.id, id), isNull(complianceItems.deletedAt)),
  });
  if (!item) return null;

  const allowed = await canAccessClient(item.clientId, actor);
  if (!allowed) return null;
  if (!item.serviceId) throw new Error("This compliance item isn't linked to a service");

  const service = await db.query.services.findFirst({ where: eq(services.id, item.serviceId) });
  if (!service) throw new Error("Linked service not found");

  const order = await createOrder(
    {
      clientId: item.clientId,
      serviceId: item.serviceId,
      quotedPricePaise: service.basePricePaise,
      govtFeePaise: service.govtFeePaise ?? undefined,
      assignedTo: actor.role === "executive" ? actor.userId : undefined,
      notes: `Created from compliance item: ${item.title}`,
    },
    actor,
  );

  await db
    .update(complianceItems)
    .set({ orderId: order.id, updatedBy: actor.userId })
    .where(eq(complianceItems.id, id));

  await recordActivity({
    actorId: actor.userId,
    entityType: "compliance_item",
    entityId: id,
    action: "order_created",
    diff: { orderId: order.id },
  });

  return order;
}

/**
 * Nightly bulk status rollover (spec 4.6): overdue once dueDate has passed, due_soon inside the
 * T-15 window. Bulk SQL updates, not per-row — cheap and idempotent, safe to re-run.
 */
export async function rollComplianceStatuses(now: Date = new Date()) {
  const dueSoonThreshold = addDays(now, DUE_SOON_DAYS);

  const overdueRows = await db
    .update(complianceItems)
    .set({ status: "overdue" })
    .where(
      and(
        isNull(complianceItems.deletedAt),
        lte(complianceItems.dueDate, now),
        ne(complianceItems.status, "filed"),
        ne(complianceItems.status, "na"),
        ne(complianceItems.status, "overdue"),
      ),
    )
    .returning({ id: complianceItems.id });

  const dueSoonRows = await db
    .update(complianceItems)
    .set({ status: "due_soon" })
    .where(
      and(
        isNull(complianceItems.deletedAt),
        gte(complianceItems.dueDate, now),
        lte(complianceItems.dueDate, dueSoonThreshold),
        eq(complianceItems.status, "upcoming"),
      ),
    )
    .returning({ id: complianceItems.id });

  return { overdue: overdueRows.length, dueSoon: dueSoonRows.length };
}

/** Items due exactly `daysAhead` from `now` (date-only match) — drives the T-15/T-7/T-1 reminders. */
export async function getItemsDueInDays(daysAhead: number, now: Date = new Date()) {
  const targetDate = addDays(now, daysAhead);
  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);

  return db.query.complianceItems.findMany({
    where: and(
      isNull(complianceItems.deletedAt),
      ne(complianceItems.status, "filed"),
      ne(complianceItems.status, "na"),
      gte(complianceItems.dueDate, dayStart),
      lte(complianceItems.dueDate, dayEnd),
    ),
    with: {
      client: {
        columns: {
          id: true,
          name: true,
          phone: true,
          email: true,
          whatsappOptedOut: true,
          assignedTo: true,
        },
      },
    },
  });
}
