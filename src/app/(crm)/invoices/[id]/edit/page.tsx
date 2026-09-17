import { ReceiptTextIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { updateInvoiceAction } from "@/actions/invoices";
import { toScope } from "@/actions/shared";
import { InvoiceEditForm } from "@/components/invoices/invoice-edit-form";
import { InvoicePageHeader } from "@/components/invoices/invoice-page-header";
import { requireRole } from "@/lib/session";
import { getInvoice } from "@/services/invoices";
import { listOrdersForClient } from "@/services/orders";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("super_admin", "manager", "accountant");
  const { id } = await params;
  const scope = await toScope(user);

  const invoice = await getInvoice(id, scope);
  if (invoice?.status !== "draft") {
    notFound();
  }

  const orders = await listOrdersForClient(invoice.client.id, scope);

  return (
    <div className="invoice-workflow mx-auto flex w-full max-w-4xl flex-col gap-5">
      <InvoicePageHeader
        title={`Edit ${invoice.invoiceNo}`}
        description="Update line items, GST, the linked job card, and due date while this invoice is still a draft."
        icon={ReceiptTextIcon}
        backHref={`/invoices/${id}`}
      />
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
