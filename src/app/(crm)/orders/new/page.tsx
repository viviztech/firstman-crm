import { createOrderAction } from "@/actions/orders";
import { OrderForm } from "@/components/orders/order-form";
import { requireRole } from "@/lib/session";
import { listServicesForOrders } from "@/services/catalog";
import { listClientOptions } from "@/services/clients";
import { listAssignableStaff } from "@/services/users";

export default async function NewOrderPage() {
  const user = await requireRole("super_admin", "manager", "executive");
  const scope = { userId: user.id, role: user.role };

  const [clients, services, staff] = await Promise.all([
    listClientOptions(scope),
    listServicesForOrders(),
    listAssignableStaff(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">New order</h1>
      {clients.length === 0 ? (
        <p className="text-sm text-muted-foreground">
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
