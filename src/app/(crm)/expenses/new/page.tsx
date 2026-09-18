import { ReceiptIndianRupeeIcon } from "lucide-react";
import { createExpenseAction } from "@/actions/expenses";
import { toScope } from "@/actions/shared";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ExpensePageHeader } from "@/components/expenses/expense-page-header";
import { requireRole } from "@/lib/session";
import { listOrderOptions } from "@/services/orders";

export default async function NewExpensePage() {
  const user = await requireRole("super_admin", "manager", "accountant");
  const orders = await listOrderOptions(await toScope(user));

  return (
    <div className="expense-workflow flex min-w-0 flex-col gap-5">
      <ExpensePageHeader
        title="New expense"
        description="Add a business cost and optionally connect it to the job card that generated it."
        icon={ReceiptIndianRupeeIcon}
      />
      <ExpenseForm
        action={createExpenseAction}
        orders={orders.map((order) => ({ id: order.id, orderNo: order.orderNo }))}
      />
    </div>
  );
}
