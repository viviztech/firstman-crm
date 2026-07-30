import Link from "next/link";
import { ExpenseFiltersForm } from "@/components/expenses/expense-filters-form";
import { ExpensesTable } from "@/components/expenses/expenses-table";
import { ListPagination } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/session";
import { listExpenses } from "@/services/expenses";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const user = await requireRole("super_admin", "manager", "accountant");
  const { page, q } = await searchParams;

  const result = await listExpenses(
    { userId: user.id, role: user.role },
    { page: page ? Number(page) : 1, search: q },
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <p className="text-sm text-muted-foreground">Simple expense log for P&amp;L.</p>
        </div>
        <Button nativeButton={false} render={<Link href="/expenses/new" />}>
          New expense
        </Button>
      </div>

      <ExpenseFiltersForm search={q} />

      <ExpensesTable expenses={result.rows} />

      <ListPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        basePath="/expenses"
        searchParams={{ q }}
      />
    </div>
  );
}
