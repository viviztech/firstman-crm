import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDocument } from "@/lib/pdf/invoice-document";
import { getCompanyProfile } from "@/services/company-profile";
import { getInvoiceForPdf } from "@/services/invoices";

/** Renders an invoice to a PDF buffer, or null if the invoice doesn't exist. */
export async function renderInvoicePdf(invoiceId: string): Promise<Buffer | null> {
  const invoice = await getInvoiceForPdf(invoiceId);
  if (!invoice) return null;

  const company = await getCompanyProfile();

  return renderToBuffer(
    <InvoiceDocument
      invoice={{
        invoiceNo: invoice.invoiceNo,
        kind: invoice.kind,
        dueDate: invoice.dueDate,
        lineItems: invoice.lineItems,
        subtotalPaise: invoice.subtotalPaise,
        gstRate: invoice.gstRate,
        gstAmountPaise: invoice.gstAmountPaise,
        totalPaise: invoice.totalPaise,
        order: invoice.order,
        client: invoice.client,
      }}
      company={company}
    />,
  );
}
