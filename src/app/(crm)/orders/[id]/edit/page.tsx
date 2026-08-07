import { notFound } from "next/navigation";
import { updateOrderAction } from "@/actions/orders";
import { toScope } from "@/actions/shared";
import { OrderEditForm } from "@/components/orders/order-edit-form";
import { requireRole } from "@/lib/session";
import { getOrder } from "@/services/orders";
import { listAssignableStaff } from "@/services/users";

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("super_admin", "manager", "executive");
  const { id } = await params;

  const [order, staff] = await Promise.all([
    getOrder(id, await toScope(user)),
    listAssignableStaff(),
  ]);

  if (!order) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Edit order {order.orderNo}</h1>
      <OrderEditForm
        action={updateOrderAction.bind(null, id)}
        role={user.role}
        staff={staff}
        orderId={id}
        defaultValues={{
          quotedPricePaise: order.quotedPricePaise,
          govtFeePaise: order.govtFeePaise,
          assignedTo: order.assignedTo,
          notes: order.notes,
        }}
      />
    </div>
  );
}
