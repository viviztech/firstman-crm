import { createInvoiceAction } from "@/actions/invoices";
import { toScope } from "@/actions/shared";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { requireRole } from "@/lib/session";
import { listClientOptions } from "@/services/clients";
import { listOrderOptions } from "@/services/orders";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; orderId?: string }>;
}) {
  const user = await requireRole("super_admin", "manager", "accountant");
  const { clientId, orderId } = await searchParams;
  const scope = await toScope(user);

  const [clients, orders] = await Promise.all([listClientOptions(scope), listOrderOptions(scope)]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">New invoice</h1>
      <InvoiceForm
        action={createInvoiceAction}
        clients={clients}
        orders={orders.map((order) => ({
          id: order.id,
          orderNo: order.orderNo,
          clientId: order.clientId,
        }))}
        defaultClientId={clientId}
        defaultOrderId={orderId}
      />
    </div>
  );
}
