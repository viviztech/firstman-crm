import { randomUUID } from "node:crypto";
import { addDays, subDays } from "date-fns";
import { eq, ilike } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { expenses } from "@/db/schema/expenses";
import { makeScope } from "@/lib/test-scope";
import {
  createExpense,
  deleteExpense,
  getExpense,
  getExpensesThisMonth,
  listExpenses,
  updateExpense,
} from "@/services/expenses";

describe("expenses service (integration)", () => {
  const managerId = randomUUID();
  const execId = randomUUID();

  const managerScope = makeScope(managerId, "manager");
  const execScope = makeScope(execId, "executive");

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: managerId,
        name: "Expense Test Manager",
        email: `expense-manager-${managerId}@test.local`,
        emailVerified: true,
        role: "manager",
      },
      {
        id: execId,
        name: "Expense Test Exec",
        email: `expense-exec-${execId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(expenses).where(ilike(expenses.category, "expense-test-marker%"));
    await db.delete(user).where(eq(user.id, managerId));
    await db.delete(user).where(eq(user.id, execId));
  });

  describe("CRUD", () => {
    it("creates, reads, updates, and soft-deletes an expense", async () => {
      const created = await createExpense(
        {
          date: new Date("2026-05-10T00:00:00.000Z"),
          category: "expense-test-marker Office Supplies",
          description: "Printer paper",
          amountPaise: 50000,
        },
        managerScope,
      );
      expect(created?.amountPaise).toBe(50000);
      if (!created) throw new Error("setup failed");

      expect(await getExpense(created.id, managerScope)).toBeTruthy();

      const updated = await updateExpense(
        created.id,
        {
          date: new Date("2026-05-11T00:00:00.000Z"),
          category: "expense-test-marker Office Supplies",
          description: "Printer paper and toner",
          amountPaise: 75000,
        },
        managerScope,
      );
      expect(updated?.amountPaise).toBe(75000);
      expect(updated?.description).toBe("Printer paper and toner");

      const deleted = await deleteExpense(created.id, managerScope);
      expect(deleted?.deletedAt).toBeTruthy();
      expect(await getExpense(created.id, managerScope)).toBeUndefined();
    });

    it("denies executives entirely — expenses are accountant/manager/admin territory", async () => {
      const created = await createExpense(
        {
          date: new Date("2026-05-10T00:00:00.000Z"),
          category: "expense-test-marker exec-blocked",
          amountPaise: 1000,
        },
        execScope,
      );
      expect(created).toBeNull();

      expect((await listExpenses(execScope)).rows).toEqual([]);
    });
  });

  describe("listExpenses", () => {
    it("filters by search across category and description", async () => {
      const created = await createExpense(
        {
          date: new Date("2026-05-12T00:00:00.000Z"),
          category: "expense-test-marker Rent",
          description: "May office rent",
          amountPaise: 4500000,
        },
        managerScope,
      );
      if (!created) throw new Error("setup failed");

      const matching = await listExpenses(managerScope, { search: "expense-test-marker Rent" });
      expect(matching.rows.map((row) => row.id)).toContain(created.id);

      const nonMatching = await listExpenses(managerScope, { search: "nonexistent-xyz-category" });
      expect(nonMatching.rows.map((row) => row.id)).not.toContain(created.id);
    });
  });

  describe("getExpensesThisMonth (time-frozen)", () => {
    it("sums only expenses dated within the given month, excluding others", async () => {
      const now = new Date("2026-04-15T00:00:00.000Z");

      const inMonth = await createExpense(
        {
          date: now,
          category: "expense-test-marker in-month",
          amountPaise: 10000,
        },
        managerScope,
      );
      const alsoInMonth = await createExpense(
        {
          date: addDays(now, 5),
          category: "expense-test-marker in-month-2",
          amountPaise: 20000,
        },
        managerScope,
      );
      const beforeMonth = await createExpense(
        {
          date: subDays(now, 40),
          category: "expense-test-marker before-month",
          amountPaise: 999999,
        },
        managerScope,
      );
      const afterMonth = await createExpense(
        {
          date: addDays(now, 40),
          category: "expense-test-marker after-month",
          amountPaise: 999999,
        },
        managerScope,
      );
      if (!inMonth || !alsoInMonth || !beforeMonth || !afterMonth) throw new Error("setup failed");

      const total = await getExpensesThisMonth(managerScope, now);
      expect(total).toBe(30000);
    });

    it("returns null for an executive", async () => {
      expect(await getExpensesThisMonth(execScope)).toBeNull();
    });
  });

  describe("role gating and not-found guards", () => {
    it("blocks an executive from getExpense and updateExpense", async () => {
      const created = await createExpense(
        {
          date: new Date("2026-05-20T00:00:00.000Z"),
          category: "expense-test-marker role-gate",
          amountPaise: 1000,
        },
        managerScope,
      );
      if (!created) throw new Error("setup failed");

      expect(await getExpense(created.id, execScope)).toBeUndefined();
      expect(
        await updateExpense(
          created.id,
          {
            date: new Date("2026-05-20T00:00:00.000Z"),
            category: "expense-test-marker role-gate",
            amountPaise: 2000,
          },
          execScope,
        ),
      ).toBeNull();
    });

    it("returns null when updating or deleting an expense that doesn't exist", async () => {
      expect(
        await updateExpense(
          randomUUID(),
          {
            date: new Date("2026-05-20T00:00:00.000Z"),
            category: "expense-test-marker missing",
            amountPaise: 1000,
          },
          managerScope,
        ),
      ).toBeNull();
      expect(await deleteExpense(randomUUID(), managerScope)).toBeNull();
    });
  });
});
