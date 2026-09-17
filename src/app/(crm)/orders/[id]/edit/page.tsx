import { ClipboardPenLineIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { updateOrderAction } from "@/actions/orders";
import { toScope } from "@/actions/shared";
import { OrderEditForm } from "@/components/orders/order-edit-form";
import { OrderPageHeader } from "@/components/orders/order-page-header";
import { requireRole } from "@/lib/session";
import { getOrder } from "@/services/orders";
import { listAssignableStaffForService } from "@/services/users";

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("super_admin", "manager", "executive");
  const { id } = await params;

  const order = await getOrder(id, await toScope(user));
  if (!order) {
    notFound();
  }

  const staff = await listAssignableStaffForService(order.service.id);

  return (
    <div className="order-workflow mx-auto flex w-full max-w-4xl flex-col gap-5">
      <OrderPageHeader
        title={`Edit ${order.orderNo}`}
        description={`Update pricing, ownership, and internal notes for ${order.service.name}.`}
        icon={ClipboardPenLineIcon}
        backHref={`/orders/${id}`}
      />
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
