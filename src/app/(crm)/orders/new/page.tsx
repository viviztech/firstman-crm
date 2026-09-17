import { ClipboardPlusIcon } from "lucide-react";
import { createOrderAction } from "@/actions/orders";
import { toScope } from "@/actions/shared";
import { OrderForm } from "@/components/orders/order-form";
import { OrderPageHeader } from "@/components/orders/order-page-header";
import { requireRole } from "@/lib/session";
import { listServicesForOrders } from "@/services/catalog";
import { listClientOptions } from "@/services/clients";
import { listAssignableStaff } from "@/services/users";

export default async function NewOrderPage() {
  const user = await requireRole("super_admin", "manager", "executive");
  const scope = await toScope(user);

  const [clients, services, staff] = await Promise.all([
    listClientOptions(scope),
    listServicesForOrders(),
    listAssignableStaff(),
  ]);

  return (
    <div className="order-workflow mx-auto flex w-full max-w-4xl flex-col gap-5">
      <OrderPageHeader
        title="New job card"
        description="Set up the client work, commercial details, owner, and start date in one place."
        icon={ClipboardPlusIcon}
      />
      {clients.length === 0 ? (
        <p className="rounded-xl border border-dashed border-pink-200 bg-white p-8 text-center text-sm text-slate-500">
          No clients available yet — create a client first.
        </p>
      ) : (
        <OrderForm
          action={createOrderAction}
          role={user.role}
          clients={clients}
          services={services}
          staff={staff}
        />
      )}
    </div>
  );
}
