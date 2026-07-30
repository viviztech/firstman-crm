import { notFound } from "next/navigation";
import { updateInvoiceAction } from "@/actions/invoices";
import { InvoiceEditForm } from "@/components/invoices/invoice-edit-form";
import { requireRole } from "@/lib/session";
import { getInvoice } from "@/services/invoices";
import { listOrdersForClient } from "@/services/orders";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("super_admin", "manager", "accountant");
  const { id } = await params;
  const scope = { userId: user.id, role: user.role };

  const invoice = await getInvoice(id, scope);
  if (invoice?.status !== "draft") {
    notFound();
  }

  const orders = await listOrdersForClient(invoice.client.id, scope);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Edit {invoice.invoiceNo}</h1>
      <InvoiceEditForm
        action={updateInvoiceAction.bind(null, id)}
        invoiceId={id}
        orders={orders.map((order) => ({ id: order.id, orderNo: order.orderNo }))}
        defaultValues={{
          orderId: invoice.orderId,
          lineItems: invoice.lineItems,
          gstRate: invoice.gstRate,
          dueDate: invoice.dueDate,
        }}
      />
    </div>
  );
}
