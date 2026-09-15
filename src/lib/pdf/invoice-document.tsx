import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { InvoiceLineItem, invoiceKindEnum } from "@/db/schema/invoices";
import { amountInWordsInr, formatMoneyPdfSafe, splitGstHalves } from "@/lib/money";
import {
  BRAND_INITIAL,
  formatPdfDate,
  ROW_ALT,
  documentStyles as styles,
} from "@/lib/pdf/document-theme";
import type { CompanyProfile } from "@/services/company-profile";

export type InvoicePdfData = {
  invoiceNo: string;
  kind: (typeof invoiceKindEnum.enumValues)[number];
  createdAt: Date;
  dueDate: Date;
  lineItems: InvoiceLineItem[];
  subtotalPaise: number;
  gstRate: number;
  gstAmountPaise: number;
  totalPaise: number;
  order: { orderNo: string } | null;
  client: {
    name: string;
    phone: string;
    gstin: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
  };
};

const TERMS_AND_CONDITIONS = [
  "Payment is due on or before the date mentioned above, by UPI, bank transfer, cash, card or cheque.",
  "Please quote this invoice/proforma number in all payment references and correspondence.",
  "Government fees, statutory charges and stamp duty, once paid to the department, are non-refundable.",
  "Fees paid for services already started or completed are non-refundable.",
  "Work on the order will proceed once payment against this document is received in full.",
  "Any dispute regarding this document must be raised in writing within 7 days of receipt.",
  "This is a computer-generated document and is valid without a physical signature.",
  "Please retain this document for your records and for GST input credit, where applicable.",
];

/** Proforma invoices are an internal advance-payment request, never a fiscal document — the
 *  eventual GST tax invoice is what carries statutory weight. Mirrors the kind check in
 *  services/invoices.ts (generateFinalInvoiceIfEligibleInTx). */
const PROFORMA_DISCLAIMER =
  "This is an advance-payment request, not a tax invoice. A GST tax invoice will be issued " +
  "automatically once the order is completed and this amount is paid in full.";

function docTitle(kind: InvoicePdfData["kind"]): string {
  return kind === "proforma" ? "PROFORMA INVOICE" : "TAX INVOICE";
}

export function InvoiceDocument({
  invoice,
  company,
}: {
  invoice: InvoicePdfData;
  company: CompanyProfile;
}) {
  const isIntraState =
    invoice.client.state !== null &&
    invoice.client.state.trim().toLowerCase() === company.addressRegion.toLowerCase();
  const [cgstPaise, sgstPaise] = splitGstHalves(invoice.gstAmountPaise);
  const clientAddressLine = [invoice.client.address, invoice.client.city, invoice.client.state]
    .filter(Boolean)
    .join(", ");
  // Two columns side by side, rather than one long list, so every term still fits on a single page.
  const termsMidpoint = Math.ceil(TERMS_AND_CONDITIONS.length / 2);
  const termsColumnOne = TERMS_AND_CONDITIONS.slice(0, termsMidpoint);
  const termsColumnTwo = TERMS_AND_CONDITIONS.slice(termsMidpoint);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topBar} fixed />

        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>{BRAND_INITIAL}</Text>
            </View>
            <View>
              <Text style={styles.brandWordmark}>{company.legalName}</Text>
              <Text style={styles.brandTagline}>CORPORATE &amp; COMPLIANCE SERVICES</Text>
              <Text style={styles.companyMeta}>
                {company.address}
                {"\n"}GSTIN {company.gstin} · LLPIN {company.llpin}
                {"\n"}
                {company.phone}
                {company.email ? ` · ${company.email}` : ""}
              </Text>
            </View>
          </View>
          <View style={styles.docBadge}>
            <Text style={styles.docTitle}>{docTitle(invoice.kind)}</Text>
            <View style={styles.docMetaRow}>
              <Text style={styles.docMetaLabel}>
                {invoice.kind === "proforma" ? "Proforma No." : "Invoice No."}
              </Text>
              <Text style={styles.docMetaValue}>{invoice.invoiceNo}</Text>
            </View>
            <View style={styles.docMetaRow}>
              <Text style={styles.docMetaLabel}>Date</Text>
              <Text style={styles.docMetaValue}>{formatPdfDate(invoice.createdAt)}</Text>
            </View>
            <View style={styles.docMetaRow}>
              <Text style={styles.docMetaLabel}>Due Date</Text>
              <Text style={styles.docMetaValue}>{formatPdfDate(invoice.dueDate)}</Text>
            </View>
            {invoice.order ? (
              <View style={styles.docMetaRow}>
                <Text style={styles.docMetaLabel}>Job Card</Text>
                <Text style={styles.docMetaValue}>{invoice.order.orderNo}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {invoice.kind === "proforma" ? (
          <Text style={styles.disclaimer}>{PROFORMA_DISCLAIMER}</Text>
        ) : null}

        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>BILLED TO</Text>
            <Text style={styles.infoName}>{invoice.client.name}</Text>
            {clientAddressLine ? (
              <Text style={styles.infoLine}>
                {clientAddressLine}
                {invoice.client.pincode ? ` - ${invoice.client.pincode}` : ""}
              </Text>
            ) : null}
            <Text style={styles.infoLine}>{invoice.client.phone}</Text>
            {invoice.client.gstin ? (
              <Text style={styles.infoLine}>GSTIN: {invoice.client.gstin}</Text>
            ) : null}
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>PAYMENT FOR</Text>
            {invoice.order ? (
              <Text style={styles.infoName}>Job Card {invoice.order.orderNo}</Text>
            ) : (
              <Text style={styles.infoName}>Professional services</Text>
            )}
            {invoice.client.state ? (
              <Text style={styles.infoLine}>Place of supply: {invoice.client.state}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colIndex, styles.headerCell]}>#</Text>
            <Text style={[styles.colDescription, styles.headerCell]}>Description</Text>
            <Text style={[styles.colQty, styles.headerCell]}>Qty</Text>
            <Text style={[styles.colRate, styles.headerCell]}>Rate</Text>
            <Text style={[styles.colGst, styles.headerCell]}>GST</Text>
            <Text style={[styles.colAmount, styles.headerCell]}>Amount</Text>
          </View>
          {invoice.lineItems.map((item, index) => (
            <View
              // biome-ignore lint/suspicious/noArrayIndexKey: line items are a static, server-rendered snapshot that's never reordered client-side
              key={`${item.description}-${index}`}
              style={[styles.tableRow, index % 2 === 1 ? { backgroundColor: ROW_ALT } : {}]}
            >
              <Text style={[styles.colIndex, styles.cellMuted]}>{index + 1}</Text>
              <Text style={[styles.colDescription, styles.cell]}>{item.description}</Text>
              <Text style={[styles.colQty, styles.cellMuted]}>{item.qty}</Text>
              <Text style={[styles.colRate, styles.cellMuted]}>
                {formatMoneyPdfSafe(item.ratePaise)}
              </Text>
              <Text style={[styles.colGst, styles.cellMuted]}>
                {invoice.gstRate > 0 ? `${invoice.gstRate}%` : "Nil"}
              </Text>
              <Text style={[styles.colAmount, styles.cell]}>
                {formatMoneyPdfSafe(item.amountPaise)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsWrap}>
          <View style={styles.wordsBox}>
            <Text style={styles.wordsLabel}>AMOUNT IN WORDS</Text>
            <Text style={styles.wordsText}>{amountInWordsInr(invoice.totalPaise)}</Text>
          </View>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatMoneyPdfSafe(invoice.subtotalPaise)}</Text>
            </View>
            {invoice.gstAmountPaise > 0 ? (
              isIntraState ? (
                <>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>
                      CGST ({(invoice.gstRate / 2).toFixed(1)}%)
                    </Text>
                    <Text style={styles.totalsValue}>{formatMoneyPdfSafe(cgstPaise)}</Text>
                  </View>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>
                      SGST ({(invoice.gstRate / 2).toFixed(1)}%)
                    </Text>
                    <Text style={styles.totalsValue}>{formatMoneyPdfSafe(sgstPaise)}</Text>
                  </View>
                </>
              ) : (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>
                    {invoice.client.state
                      ? `IGST (${invoice.gstRate}%)`
                      : `GST (${invoice.gstRate}%)`}
                  </Text>
                  <Text style={styles.totalsValue}>
                    {formatMoneyPdfSafe(invoice.gstAmountPaise)}
                  </Text>
                </View>
              )
            ) : null}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>
                {invoice.kind === "proforma" ? "Amount Payable" : "Total"}
              </Text>
              <Text style={styles.grandTotalValue}>{formatMoneyPdfSafe(invoice.totalPaise)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>TERMS &amp; CONDITIONS</Text>
          <View style={styles.termsColumns}>
            <View style={styles.termsColumn}>
              {termsColumnOne.map((term, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: a fixed, hardcoded list rendered once per document — never reordered or edited client-side
                <View style={styles.termRow} key={`term-${index}`}>
                  <Text style={styles.termBullet}>{index + 1}.</Text>
                  <Text style={styles.termText}>{term}</Text>
                </View>
              ))}
            </View>
            <View style={styles.termsColumn}>
              {termsColumnTwo.map((term, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: a fixed, hardcoded list rendered once per document — never reordered or edited client-side
                <View style={styles.termRow} key={`term-${index}`}>
                  <Text style={styles.termBullet}>{termsColumnOne.length + index + 1}.</Text>
                  <Text style={styles.termText}>{term}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerNote}>
            This is a system-generated {invoice.kind === "proforma" ? "proforma" : "tax"} invoice.
            For queries regarding this document, please contact us at {company.phone}
            {company.email ? ` or ${company.email}` : ""}.
          </Text>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureFor}>For {company.legalName}</Text>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>Authorized Signatory</Text>
            </View>
          </View>
        </View>

        <View style={styles.pageFooterRule} fixed />
        <Text style={styles.pageFooterText} fixed>
          {company.legalName} · {company.address}
        </Text>
      </Page>
    </Document>
  );
}
