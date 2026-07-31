import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { and, asc, count, eq, gte, isNull, lt, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema/catalog";
import { payments } from "@/db/schema/invoices";
import { leads } from "@/db/schema/leads";
import { orders, orderTasks } from "@/db/schema/orders";
import { sumPaise } from "@/lib/money";
import type { ActorScope } from "@/lib/scope";

/** Manager/Admin dashboard: leads created this month, grouped by status. */
export async function getLeadsThisMonthByStatus(scope: ActorScope, now: Date = new Date()) {
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const rows = await db
    .select({ status: leads.status, count: count() })
    .from(leads)
    .where(
      and(
        isNull(leads.deletedAt),
        gte(leads.createdAt, monthStart),
        lte(leads.createdAt, monthEnd),
        scope.role === "executive" ? eq(leads.assignedTo, scope.userId) : undefined,
      ),
    )
    .groupBy(leads.status);

  return rows.map((row) => ({ status: row.status, count: row.count }));
}

/** Manager/Admin dashboard: total payments collected this month vs the prior month. */
export async function getRevenueThisMonthVsLast(
  now: Date = new Date(),
): Promise<{ thisMonthPaise: number; lastMonthPaise: number }> {
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const [thisMonthRows, lastMonthRows] = await Promise.all([
    db
      .select({ amountPaise: payments.amountPaise })
      .from(payments)
      .where(and(gte(payments.paidAt, thisMonthStart), lte(payments.paidAt, thisMonthEnd))),
    db
      .select({ amountPaise: payments.amountPaise })
      .from(payments)
      .where(and(gte(payments.paidAt, lastMonthStart), lte(payments.paidAt, lastMonthEnd))),
  ]);

  return {
    thisMonthPaise: sumPaise(thisMonthRows.map((row) => row.amountPaise)),
    lastMonthPaise: sumPaise(lastMonthRows.map((row) => row.amountPaise)),
  };
}

/** Manager/Admin dashboard: open orders grouped by status. */
export async function getOrdersByStatusCounts(scope: ActorScope) {
  const rows = await db
    .select({ status: orders.status, count: count() })
    .from(orders)
    .where(
      and(
        isNull(orders.deletedAt),
        scope.role === "executive" ? eq(orders.assignedTo, scope.userId) : undefined,
      ),
    )
    .groupBy(orders.status);

  return rows.map((row) => ({ status: row.status, count: row.count }));
}

/** Manager/Admin dashboard: order tasks past their due date and not yet done. */
export async function getOverdueTasks(scope: ActorScope, limit = 10, now: Date = new Date()) {
  return db.query.orderTasks.findMany({
    where: and(
      isNull(orderTasks.deletedAt),
      ne(orderTasks.status, "done"),
      lt(orderTasks.dueAt, now),
      scope.role === "executive" ? eq(orderTasks.assignedTo, scope.userId) : undefined,
    ),
    orderBy: [asc(orderTasks.dueAt)],
    limit,
    with: {
      order: {
        columns: { id: true, orderNo: true },
        with: { client: { columns: { name: true } } },
      },
    },
  });
}

/** Manager/Admin dashboard: services generating the most order revenue (quoted price, non-cancelled). */
export async function getTopServicesByRevenue(scope: ActorScope, limit = 5) {
  const rows = await db
    .select({
      serviceId: orders.serviceId,
      serviceName: services.name,
      totalPaise: sql<number>`sum(${orders.quotedPricePaise})`.mapWith(Number),
    })
    .from(orders)
    .innerJoin(services, eq(orders.serviceId, services.id))
    .where(
      and(
        isNull(orders.deletedAt),
        ne(orders.status, "cancelled"),
        scope.role === "executive" ? eq(orders.assignedTo, scope.userId) : undefined,
      ),
    )
    .groupBy(orders.serviceId, services.name)
    .orderBy(sql`sum(${orders.quotedPricePaise}) desc`)
    .limit(limit);

  return rows;
}

/** Executive dashboard: their open order tasks (not done), soonest due first. */
export async function getMyOpenTasks(userId: string, limit = 10) {
  return db.query.orderTasks.findMany({
    where: and(
      isNull(orderTasks.deletedAt),
      eq(orderTasks.assignedTo, userId),
      ne(orderTasks.status, "done"),
    ),
    orderBy: [asc(orderTasks.dueAt)],
    limit,
    with: { order: { columns: { id: true, orderNo: true } } },
  });
}

/** Executive dashboard: their orders currently in progress. */
export async function getMyOrdersInProgress(userId: string, limit = 10) {
  return db.query.orders.findMany({
    where: and(
      isNull(orders.deletedAt),
      eq(orders.assignedTo, userId),
      or(eq(orders.status, "in_progress"), eq(orders.status, "govt_processing")),
    ),
    orderBy: [asc(orders.dueAt)],
    limit,
    with: { client: { columns: { id: true, name: true } }, service: { columns: { name: true } } },
  });
}
