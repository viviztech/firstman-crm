import { notFound } from "next/navigation";
import { updateExpenseAction } from "@/actions/expenses";
import { toScope } from "@/actions/shared";
import { ExpenseEditForm } from "@/components/expenses/expense-edit-form";
import { requireRole } from "@/lib/session";
import { getExpense } from "@/services/expenses";
import { listOrderOptions } from "@/services/orders";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("super_admin", "manager", "accountant");
  const { id } = await params;
  const scope = await toScope(user);

  const [expense, orders] = await Promise.all([getExpense(id, scope), listOrderOptions(scope)]);
  if (!expense) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Edit expense</h1>
      <ExpenseEditForm
        action={updateExpenseAction.bind(null, id)}
        orders={orders.map((order) => ({ id: order.id, orderNo: order.orderNo }))}
        defaultValues={{
          date: expense.date,
          category: expense.category,
          description: expense.description,
          amountPaise: expense.amountPaise,
          orderId: expense.orderId,
        }}
      />
    </div>
  );
}
