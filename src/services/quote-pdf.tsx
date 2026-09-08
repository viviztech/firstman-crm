import { renderToBuffer } from "@react-pdf/renderer";
import { QuoteDocument } from "@/lib/pdf/quote-document";
import { getCompanyProfile } from "@/services/company-profile";
import { getQuoteForPdf } from "@/services/quotes";

/** Renders a quote to a PDF buffer, or null if the quote doesn't exist. */
export async function renderQuotePdf(quoteId: string): Promise<Buffer | null> {
  const quote = await getQuoteForPdf(quoteId);
  if (!quote) return null;

  const company = await getCompanyProfile();

  return renderToBuffer(
    <QuoteDocument
      quote={{
        quoteNo: quote.quoteNo,
        createdAt: quote.createdAt,
        serviceName: quote.serviceName,
        stateName: quote.stateName,
        numberOfDirectors: quote.numberOfDirectors,
        capitalAmountPaise: quote.capitalAmountPaise,
        lineItems: quote.lineItems,
        subtotalPaise: quote.subtotalPaise,
        gstRate: quote.gstRate,
        gstAmountPaise: quote.gstAmountPaise,
        totalPaise: quote.totalPaise,
        clientName: quote.clientName,
        clientEmail: quote.clientEmail,
        clientPhone: quote.clientPhone,
      }}
      company={company}
    />,
  );
}
