import { ReceiptTextIcon } from "lucide-react";
import { createInvoiceAction } from "@/actions/invoices";
import { toScope } from "@/actions/shared";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { InvoicePageHeader } from "@/components/invoices/invoice-page-header";
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
    <div className="invoice-workflow mx-auto flex w-full max-w-4xl flex-col gap-5">
      <InvoicePageHeader
        title="New invoice"
        description="Build the client bill, link its job card, set tax, and confirm the payment due date."
        icon={ReceiptTextIcon}
      />
      <InvoiceForm
        action={createInvoiceAction}
        clients={clients}
        orders={orders.map((order) => ({
          id: order.id,
          orderNo: order.orderNo,
          clientId: order.clientId,
          serviceName: order.service.name,
          quotedPricePaise: order.quotedPricePaise,
          govtFeePaise: order.govtFeePaise,
        }))}
        defaultClientId={clientId}
        defaultOrderId={orderId}
      />
    </div>
  );
}
