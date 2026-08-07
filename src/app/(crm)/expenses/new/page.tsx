import { createExpenseAction } from "@/actions/expenses";
import { toScope } from "@/actions/shared";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { requireRole } from "@/lib/session";
import { listOrderOptions } from "@/services/orders";

export default async function NewExpensePage() {
  const user = await requireRole("super_admin", "manager", "accountant");
  const orders = await listOrderOptions(await toScope(user));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">New expense</h1>
      <ExpenseForm
        action={createExpenseAction}
        orders={orders.map((order) => ({ id: order.id, orderNo: order.orderNo }))}
      />
    </div>
  );
}
