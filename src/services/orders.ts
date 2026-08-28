import { endOfMonth, startOfMonth } from "date-fns";
import { and, count, eq, gte, ilike, inArray, isNull, lt, lte, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { services } from "@/db/schema/catalog";
import { documents } from "@/db/schema/documents";
import { invoices } from "@/db/schema/invoices";
import { orderStatusEnum, orders, orderTaskStatusEnum, orderTasks } from "@/db/schema/orders";
import { staffProfiles, staffServiceAssignments } from "@/db/schema/staff";
import { WIP_STATUSES } from "@/lib/badges";
import { inferDocumentKind } from "@/lib/document-kind";
import type { ActorScope } from "@/lib/scope";
import { isAssignedEmployee, teamCondition, visibilityConditions } from "@/lib/scope";
import { optionalDateTime, optionalTrimmed } from "@/lib/validation/helpers";
import { recordActivity } from "@/services/activity-log";
import { listDocumentsForOwner } from "@/services/documents";
import { generateFinalInvoiceIfEligibleInTx } from "@/services/invoices";
import { getSettingForUpdate, setSetting } from "@/services/settings";

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

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

/**
 * Executives only ever see/act on orders in scope — internal-type by assignedTo, franchise-type
 * by pincode territory (resolved via the client, orders carry no pincode of their own), both
 * further narrowed by service assignment if configured (spec 3, ADR 0001), and further narrowed
 * to operations-team executives only (sales-team executives see no orders at all — ADR 0002).
 *
 * Internal operations-team executives additionally see unassigned, still-open job cards within
 * their service scope — work that's "ready to pick up" (ADR 0005) — alongside their own-assigned
 * rows, so a picked-list item is actually reachable (getOrder) rather than 404ing the moment they
 * click into it. Franchise-type operations executives don't need this: territoryCondition already
 * shows them every order in their pincode territory regardless of assignedTo.
 */
function scopeCondition(scope: ActorScope) {
  const team = teamCondition(scope, "operations");

  let visibility = visibilityConditions(scope, {
    assignedToColumn: orders.assignedTo,
    clientIdColumn: orders.clientId,
    serviceIdColumn: orders.serviceId,
  });

  if (
    scope.role === "executive" &&
    isAssignedEmployee(scope) &&
    scope.team === "operations" &&
    scope.serviceIds.length > 0
  ) {
    const readyToPickUp = and(
      isNull(orders.assignedTo),
      inArray(orders.serviceId, scope.serviceIds),
      inArray(orders.status, WIP_STATUSES),
    );
    visibility = visibility ? or(visibility, readyToPickUp) : readyToPickUp;
  }

  if (team && visibility) return and(team, visibility);
  return team ?? visibility;
}

/**
 * Internal-type executives can't assign orders to anyone but themselves; franchise-type staff
 * (territory-shared) can assign within their team (ADR 0001). Only operations-team executives
 * self-assign this way — a sales-team executive closing a sale must NOT have the new job card
 * pinned to them, since job cards are operations-team-scoped and would become invisible to
 * everyone else (ADR 0002). Job cards created by Sales stay unassigned until an operations
 * lead/manager picks them up.
 */
function enforceAssignment(assignedTo: string | undefined, actor: ActorScope) {
  return actor.role === "executive" && isAssignedEmployee(actor) && actor.team === "operations"
    ? actor.userId
    : assignedTo;
}

/**
 * Service scoping is optional/unrestricted-by-default everywhere else (ADR 0001), but mandatory
 * for operations-team executives specifically: they're the ones who actually do the fulfillment
 * work, so a job card must only land with someone equipped for that service (ADR 0004). A no-op
 * for every other assignee (unassigned, non-operations, or non-executive) — this only ever
 * narrows who an operations executive can be assigned, never widens anyone else's access. Reads
 * the assignee's *persisted* team/scope from staff_profiles, not the caller's ActorScope, since
 * the assignee is frequently a different user than the actor making the assignment.
 */
async function assertOperationsAssigneeServiceScope(
  tx: Transaction,
  assignedTo: string | undefined,
  serviceId: string,
): Promise<void> {
  if (!assignedTo) return;

  const profile = await tx.query.staffProfiles.findFirst({
    where: eq(staffProfiles.userId, assignedTo),
  });
  if (profile?.team !== "operations") return;

  const assignments = await tx
    .select({ serviceId: staffServiceAssignments.serviceId })
    .from(staffServiceAssignments)
    .where(eq(staffServiceAssignments.userId, assignedTo));
  const scopedServiceIds = new Set(assignments.map((row) => row.serviceId));

  if (!scopedServiceIds.has(serviceId)) {
    throw new Error(
      "This operations executive isn't scoped to this service — assign it to them under Settings → Users first.",
    );
  }
}

/**
 * The year+month component shared by the job card sequence's settings key and its display
 * format, so both are guaranteed to roll over at the same instant. Pure and exported so the
 * month-boundary behavior is unit-testable without touching the DB or faking global timers
 * (real Postgres I/O + vi.useFakeTimers() doesn't mix — see orders.test.ts).
 */
export function jobCardYearMonth(now: Date): string {
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}`;
}

/** Job card number, format FMJC<year+month><5-digit seq> (ADR 0002/0003) — monthly reset. */
export function formatJobCardNo(yearMonth: string, seq: number): string {
  return `FMJC${yearMonth}${String(seq).padStart(5, "0")}`;
}

/**
 * "Job card" and "order" are the same entity (orderNo column, orders table); only the generated
 * number's format/cadence changed here, prospectively.
 */
async function generateOrderNo(tx: Transaction, actor: ActorScope): Promise<string> {
  const yearMonth = jobCardYearMonth(new Date());
  const key = `jobCardNumberSeq:${yearMonth}`;
  const last = await getSettingForUpdate<number>(key, 0, tx);
  const next = last + 1;
  await setSetting(key, next, actor, tx);
  return formatJobCardNo(yearMonth, next);
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

/**
 * Select-dropdown list for the invoice form's order picker — carries enough of the order's own
 * billing data (service name, quoted price, govt fee) that picking an order can prefill the
 * invoice's line items instead of starting blank next to a job card that already has this
 * information (mirrors the line items closeEnquiryAsSale generates for a job card's own proforma).
 */
export async function listOrderOptions(scope: ActorScope) {
  const conditions = [isNull(orders.deletedAt)];
  const scoped = scopeCondition(scope);
  if (scoped) conditions.push(scoped);

  return db.query.orders.findMany({
    where: and(...conditions),
    orderBy: (order, { desc }) => [desc(order.createdAt)],
    columns: {
      id: true,
      orderNo: true,
      clientId: true,
      quotedPricePaise: true,
      govtFeePaise: true,
    },
    with: {
      client: { columns: { name: true } },
      service: { columns: { name: true } },
    },
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

/** Unscoped fetch for notification jobs — system-context, not a user request (mirrors getInvoiceForPdf). */
export async function getOrderForNotification(id: string) {
  return db.query.orders.findFirst({
    where: and(eq(orders.id, id), isNull(orders.deletedAt)),
    columns: { id: true, orderNo: true, status: true, assignedTo: true },
    with: {
      client: {
        columns: { id: true, name: true, phone: true, email: true, whatsappOptedOut: true },
      },
    },
  });
}

/** Orders (scoped) currently flagged docs-pending — for the weekly client reminder cron. */
export async function listOrdersWithPendingDocs() {
  const openOrders = await db.query.orders.findMany({
    where: and(
      isNull(orders.deletedAt),
      ne(orders.status, "completed"),
      ne(orders.status, "cancelled"),
    ),
    columns: { id: true, orderNo: true },
    with: {
      client: {
        columns: { id: true, name: true, phone: true, email: true, whatsappOptedOut: true },
      },
    },
  });

  const pendingIds = await getDocsPendingOrderIds(openOrders.map((order) => order.id));
  return openOrders.filter((order) => pendingIds.has(order.id));
}

const JOB_CARD_DASHBOARD_WITH = {
  client: { columns: { id: true, name: true } },
  service: { columns: { id: true, name: true } },
} as const;

/** Operations-executive dashboard: their active (WIP) job cards, soonest due first. Hard-filtered
 * by assignedTo, so — unlike scopeCondition — this is safe for both internal and franchise
 * employeeTypes without an ActorScope. */
export async function listMyJobCards(userId: string, limit = 50) {
  const rows = await db.query.orders.findMany({
    where: and(
      isNull(orders.deletedAt),
      eq(orders.assignedTo, userId),
      inArray(orders.status, WIP_STATUSES),
    ),
    orderBy: (order, { asc }) => [asc(order.dueAt)],
    limit,
    with: JOB_CARD_DASHBOARD_WITH,
  });

  const docsPending = await getDocsPendingOrderIds(rows.map((row) => row.id));
  return rows.map((row) => ({ ...row, docsPending: docsPending.has(row.id) }));
}

/** Operations-executive dashboard: their completed job cards, most recently finished first. */
export async function listMyCompletedJobCards(userId: string, limit = 50) {
  return db.query.orders.findMany({
    where: and(
      isNull(orders.deletedAt),
      eq(orders.assignedTo, userId),
      eq(orders.status, "completed"),
    ),
    orderBy: (order, { desc }) => [desc(order.completedAt)],
    limit,
    with: JOB_CARD_DASHBOARD_WITH,
  });
}

/** Operations-executive dashboard: their cancelled job cards, most recently updated first. */
export async function listMyCancelledJobCards(userId: string, limit = 50) {
  return db.query.orders.findMany({
    where: and(
      isNull(orders.deletedAt),
      eq(orders.assignedTo, userId),
      eq(orders.status, "cancelled"),
    ),
    orderBy: (order, { desc }) => [desc(order.updatedAt)],
    limit,
    with: JOB_CARD_DASHBOARD_WITH,
  });
}

/**
 * Operations-executive dashboard: unassigned, still-open job cards within this executive's
 * service scope — work "ready to pick up" (ADR 0005), soonest due first. Empty for anyone not an
 * unscoped-eligible internal operations executive, mirroring the same gate
 * `assertOperationsAssigneeServiceScope` enforces on the actual pickup.
 */
export async function listJobCardsAvailableToPickUp(scope: ActorScope, limit = 50) {
  if (
    scope.role !== "executive" ||
    !isAssignedEmployee(scope) ||
    scope.team !== "operations" ||
    scope.serviceIds.length === 0
  ) {
    return [];
  }

  return db.query.orders.findMany({
    where: and(
      isNull(orders.deletedAt),
      isNull(orders.assignedTo),
      inArray(orders.serviceId, scope.serviceIds),
      inArray(orders.status, WIP_STATUSES),
    ),
    orderBy: (order, { asc }) => [asc(order.dueAt)],
    limit,
    with: JOB_CARD_DASHBOARD_WITH,
  });
}

/**
 * Stat row for the operations-executive dashboard, mirroring getMySalesDashboardStats's shape on
 * the sales side. Every count is hard-filtered by assignedTo = userId — unlike getOverdueTasks
 * (which only franchise-filters "internal" employees per its own scope caveat), this is safe to
 * call for both internal and franchise executives.
 */
export async function getMyJobCardDashboardStats(userId: string, now: Date = new Date()) {
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const weekAhead = new Date(now.getTime() + 7 * DAY_MS);

  const wipOrders = await db.query.orders.findMany({
    where: and(
      isNull(orders.deletedAt),
      eq(orders.assignedTo, userId),
      inArray(orders.status, WIP_STATUSES),
    ),
    columns: { id: true, dueAt: true },
  });
  const docsPendingIds = await getDocsPendingOrderIds(wipOrders.map((order) => order.id));

  const [[overdueTasksRow], [completedThisMonthRow], [completedTillDateRow]] = await Promise.all([
    db
      .select({ value: count() })
      .from(orderTasks)
      .where(
        and(
          isNull(orderTasks.deletedAt),
          eq(orderTasks.assignedTo, userId),
          ne(orderTasks.status, "done"),
          lt(orderTasks.dueAt, now),
        ),
      ),
    db
      .select({ value: count() })
      .from(orders)
      .where(
        and(
          isNull(orders.deletedAt),
          eq(orders.assignedTo, userId),
          eq(orders.status, "completed"),
          gte(orders.completedAt, monthStart),
          lte(orders.completedAt, monthEnd),
        ),
      ),
    db
      .select({ value: count() })
      .from(orders)
      .where(
        and(
          isNull(orders.deletedAt),
          eq(orders.assignedTo, userId),
          eq(orders.status, "completed"),
        ),
      ),
  ]);

  return {
    totalJobCards: wipOrders.length,
    overdueTasks: overdueTasksRow?.value ?? 0,
    docsPending: docsPendingIds.size,
    completedThisMonth: completedThisMonthRow?.value ?? 0,
    dueThisWeek: wipOrders.filter((order) => order.dueAt.getTime() <= weekAhead.getTime()).length,
    completedTillDate: completedTillDateRow?.value ?? 0,
  };
}

/**
 * Creates an order and, in the same transaction, generates its task checklist and document
 * checklist (spec 4.4). Extracted from `createOrder` so callers that already hold a transaction
 * (e.g. the enquiry Sales action, which also converts the enquiry to a client) can compose it
 * instead of nesting a second `db.transaction`.
 */
export async function createOrderInTx(tx: Transaction, input: OrderInput, actor: ActorScope) {
  const service = await tx.query.services.findFirst({ where: eq(services.id, input.serviceId) });
  if (!service) throw new Error("Service not found");

  const assignedTo = enforceAssignment(input.assignedTo, actor);
  await assertOperationsAssigneeServiceScope(tx, assignedTo, input.serviceId);
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
}

export async function createOrder(input: OrderInput, actor: ActorScope) {
  return db.transaction((tx) => createOrderInTx(tx, input, actor));
}

/**
 * Self-service claim of an unassigned job card that's within the acting operations executive's
 * service scope (ADR 0005) — the one-click complement to `updateOrder`'s full edit form. Reuses
 * `assertOperationsAssigneeServiceScope` so this can never succeed somewhere the mandatory-scope
 * check (ADR 0004) would otherwise reject. Returns null (rather than throwing) if the job card is
 * gone, deleted, or was already picked up by someone else in the meantime — a plain "no longer
 * available" case, not an error.
 */
export async function pickUpJobCard(orderId: string, actor: ActorScope) {
  if (actor.role !== "executive" || !isAssignedEmployee(actor) || actor.team !== "operations") {
    throw new Error("Only operations executives can pick up a job card this way.");
  }

  return db.transaction(async (tx) => {
    const existing = await tx.query.orders.findFirst({
      where: and(
        eq(orders.id, orderId),
        isNull(orders.deletedAt),
        isNull(orders.assignedTo),
        inArray(orders.status, WIP_STATUSES),
      ),
    });
    if (!existing) return null;

    await assertOperationsAssigneeServiceScope(tx, actor.userId, existing.serviceId);

    const [updated] = await tx
      .update(orders)
      .set({ assignedTo: actor.userId, updatedBy: actor.userId })
      .where(eq(orders.id, existing.id))
      .returning();
    if (!updated) throw new Error("Failed to pick up job card");

    await recordActivity(
      { actorId: actor.userId, entityType: "order", entityId: updated.id, action: "picked_up" },
      tx,
    );

    return updated;
  });
}

export async function updateOrder(id: string, input: OrderEditInput, actor: ActorScope) {
  const assignedTo = enforceAssignment(input.assignedTo, actor);

  return db.transaction(async (tx) => {
    const conditions = [eq(orders.id, id), isNull(orders.deletedAt)];
    const scoped = scopeCondition(actor);
    if (scoped) conditions.push(scoped);

    const existing = await tx.query.orders.findFirst({ where: and(...conditions) });
    if (!existing) return null;

    await assertOperationsAssigneeServiceScope(tx, assignedTo, existing.serviceId);

    const [updated] = await tx
      .update(orders)
      .set({
        quotedPricePaise: input.quotedPricePaise,
        govtFeePaise: input.govtFeePaise,
        assignedTo,
        notes: input.notes,
        updatedBy: actor.userId,
      })
      .where(eq(orders.id, existing.id))
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

/**
 * Blocks a transition to "completed" unless every task is done AND the order's proforma (if any)
 * is paid in full — "Completed" is meant to mean payment and work, together (ADR 0002). Orders
 * with no proforma at all (created outside the Sales/proforma flow) are exempt from the payment
 * half, since they were never billed that way; a zero-task order is vacuously "all tasks done".
 * Throws a descriptive Error rather than silently no-opping, matching the codebase's existing
 * pattern (see updateEnquiryStatus's "must go through Sales action" error).
 */
async function assertCanComplete(tx: Transaction, orderId: string): Promise<void> {
  const openTasks = await tx.query.orderTasks.findMany({
    where: and(
      eq(orderTasks.orderId, orderId),
      isNull(orderTasks.deletedAt),
      ne(orderTasks.status, "done"),
    ),
  });
  if (openTasks.length > 0) {
    throw new Error("All tasks must be marked done before completing this job card.");
  }

  const proforma = await tx.query.invoices.findFirst({
    where: and(
      eq(invoices.orderId, orderId),
      eq(invoices.kind, "proforma"),
      isNull(invoices.deletedAt),
    ),
    orderBy: (invoice, { desc }) => [desc(invoice.createdAt)],
  });
  if (proforma && proforma.status !== "paid") {
    throw new Error("The proforma invoice must be paid in full before completing this job card.");
  }
}

export async function updateOrderStatus(
  id: string,
  status: (typeof orderStatusEnum.enumValues)[number],
  actor: ActorScope,
  opts: { force?: boolean } = {},
) {
  return db.transaction(async (tx) => {
    const conditions = [eq(orders.id, id), isNull(orders.deletedAt)];
    const scoped = scopeCondition(actor);
    if (scoped) conditions.push(scoped);

    const existing = await tx.query.orders.findFirst({ where: and(...conditions) });
    if (!existing) return null;

    // Bypass is super_admin-only, checked against the actor here — never trust a client-supplied
    // force flag alone. Managers are deliberately excluded: the gate exists specifically to stop
    // unpaid/incomplete work from being marked done, and that override belongs to the same role
    // already trusted with other irreversible actions (e.g. hard-deleting a lost enquiry).
    const bypassGate = opts.force === true && actor.role === "super_admin";
    if (status === "completed" && !bypassGate) {
      await assertCanComplete(tx, id);
    }

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
        action: status === "completed" && bypassGate ? "status_changed_forced" : "status_changed",
        diff: { status, forced: status === "completed" ? bypassGate : undefined },
      },
      tx,
    );

    // The final tax invoice only ever fires once both halves are true (order completed + its
    // proforma paid in full) — this covers the "job finished after payment" ordering; recordPayment
    // covers the reverse (spec 4.7 extension). A forced completion with an unpaid proforma simply
    // won't satisfy this check yet — the tax invoice still waits for the payment to land.
    let finalInvoice: Awaited<ReturnType<typeof generateFinalInvoiceIfEligibleInTx>> = null;
    if (status === "completed") {
      finalInvoice = await generateFinalInvoiceIfEligibleInTx(tx, updated.id, actor);
    }

    // Spread rather than nest, so every existing caller reading order columns directly
    // (`updated.status`, `updated.completedAt`, ...) keeps working unchanged; `finalInvoice`
    // is additive, read only by the action layer that needs to enqueue on a genuinely new one.
    return { ...updated, finalInvoice };
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
