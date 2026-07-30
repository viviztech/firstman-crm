import { endOfMonth, startOfMonth } from "date-fns";
import { and, count, eq, gte, ilike, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { expenses } from "@/db/schema/expenses";
import type { Role } from "@/lib/auth";
import { sumPaise } from "@/lib/money";
import type { ActorScope } from "@/lib/scope";
import { optionalTrimmed, optionalUuid } from "@/lib/validation/helpers";
import { recordActivity } from "@/services/activity-log";

const PAGE_SIZE = 20;

/** Same access boundary as invoices — expenses are accountant/manager/admin territory, not executive. */
const ALLOWED_ROLES: Role[] = ["super_admin", "manager", "accountant"];
function canAccessExpenses(scope: ActorScope): boolean {
  return ALLOWED_ROLES.includes(scope.role);
}

export const expenseInputSchema = z.object({
  date: z.coerce.date(),
  category: z.string().trim().min(1, "Category is required").max(100),
  description: optionalTrimmed(500),
  amountPaise: z.coerce.number().int().positive("Amount must be greater than 0"),
  orderId: optionalUuid,
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;

export async function listExpenses(
  scope: ActorScope,
  opts: { page?: number; search?: string } = {},
) {
  if (!canAccessExpenses(scope)) return { rows: [], total: 0, page: 1, pageSize: PAGE_SIZE };

  const page = Math.max(1, opts.page ?? 1);
  const conditions = [isNull(expenses.deletedAt)];
  if (opts.search) {
    const term = `%${opts.search}%`;
    const searchCondition = or(ilike(expenses.category, term), ilike(expenses.description, term));
    if (searchCondition) conditions.push(searchCondition);
  }
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db.query.expenses.findMany({
      where,
      orderBy: (expense, { desc: descFn }) => [descFn(expense.date)],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      with: { order: { columns: { id: true, orderNo: true } } },
    }),
    db.select({ total: count() }).from(expenses).where(where),
  ]);

  return { rows, total: totalRows[0]?.total ?? 0, page, pageSize: PAGE_SIZE };
}

export async function getExpense(id: string, scope: ActorScope) {
  if (!canAccessExpenses(scope)) return undefined;

  return db.query.expenses.findFirst({
    where: and(eq(expenses.id, id), isNull(expenses.deletedAt)),
    with: { order: { columns: { id: true, orderNo: true } } },
  });
}

export async function createExpense(input: ExpenseInput, actor: ActorScope) {
  if (!canAccessExpenses(actor)) return null;

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(expenses)
      .values({ ...input, createdBy: actor.userId, updatedBy: actor.userId })
      .returning();
    if (!created) throw new Error("Failed to create expense");

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "expense",
        entityId: created.id,
        action: "created",
        diff: input,
      },
      tx,
    );

    return created;
  });
}

export async function updateExpense(id: string, input: ExpenseInput, actor: ActorScope) {
  if (!canAccessExpenses(actor)) return null;

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(expenses)
      .set({ ...input, updatedBy: actor.userId })
      .where(and(eq(expenses.id, id), isNull(expenses.deletedAt)))
      .returning();
    if (!updated) return null;

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "expense",
        entityId: updated.id,
        action: "updated",
        diff: input,
      },
      tx,
    );

    return updated;
  });
}

export async function deleteExpense(id: string, actor: ActorScope) {
  if (!canAccessExpenses(actor)) return null;

  return db.transaction(async (tx) => {
    const [deleted] = await tx
      .update(expenses)
      .set({ deletedAt: new Date(), updatedBy: actor.userId })
      .where(and(eq(expenses.id, id), isNull(expenses.deletedAt)))
      .returning();
    if (!deleted) return null;

    await recordActivity(
      { actorId: actor.userId, entityType: "expense", entityId: deleted.id, action: "deleted" },
      tx,
    );

    return deleted;
  });
}

/** Sum of expenses recorded this calendar month — accountant dashboard widget + simple P&L (spec 4.7). */
export async function getExpensesThisMonth(
  scope: ActorScope,
  now: Date = new Date(),
): Promise<number | null> {
  if (!canAccessExpenses(scope)) return null;

  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const rows = await db
    .select({ amountPaise: expenses.amountPaise })
    .from(expenses)
    .where(
      and(isNull(expenses.deletedAt), gte(expenses.date, monthStart), lte(expenses.date, monthEnd)),
    );

  return sumPaise(rows.map((row) => row.amountPaise));
}
