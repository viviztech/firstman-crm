import { Document, Page, Text, View } from "@react-pdf/renderer";
import { addDays } from "date-fns";
import type { QuoteLineItem } from "@/db/schema/quotes";
import { amountInWordsInr, formatMoneyPdfSafe, splitGstHalves } from "@/lib/money";
import {
  BRAND_INITIAL,
  formatPdfDate,
  ROW_ALT,
  documentStyles as styles,
} from "@/lib/pdf/document-theme";
import type { CompanyProfile } from "@/services/company-profile";

export type QuotePdfData = {
  quoteNo: string;
  createdAt: Date;
  serviceName: string;
  stateName: string | null;
  numberOfDirectors: number | null;
  capitalAmountPaise: number | null;
  lineItems: QuoteLineItem[];
  subtotalPaise: number;
  gstRate: number;
  gstAmountPaise: number;
  totalPaise: number;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
};

/** A quotation is a non-binding estimate — this is how long it's held to be worth honoring before fees should be re-confirmed. */
const VALIDITY_DAYS = 15;

/** Government fees, stamp duty, and other statutory pass-through components are never GST-able —
 *  only FirstMan's own service charge is. Mirrors the filter in services/quotes.ts. */
const TAXABLE_LINE_LABEL = "Professional fee";

const TERMS_AND_CONDITIONS = [
  "This quotation is valid for the period mentioned in the quotation.",
  "The quoted amount covers only the services mentioned in the quotation.",
  "Government fees, statutory charges and GST will be extra, unless specifically mentioned.",
  "The client must provide the required documents and information on time.",
  "The mentioned timeline is approximate and may vary depending on government departments or third-party approvals.",
  "Any additional services or requirements not mentioned in the quotation will be charged separately.",
  "Fees paid for services already started or completed are non-refundable.",
  "The client is responsible for providing correct and valid documents and information.",
  "By accepting the quotation or making payment, the client agrees to these terms and conditions.",
];

export function QuoteDocument({
  quote,
  company,
}: {
  quote: QuotePdfData;
  company: CompanyProfile;
}) {
  const validUntil = addDays(quote.createdAt, VALIDITY_DAYS);
  const isIntraState =
    quote.stateName !== null &&
    quote.stateName.trim().toLowerCase() === company.addressRegion.toLowerCase();
  const [cgstPaise, sgstPaise] = splitGstHalves(quote.gstAmountPaise);
  // Two columns side by side, rather than one long list, so 9 terms still fit on a single page.
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
            <Text style={styles.docTitle}>QUOTATION</Text>
            <View style={styles.docMetaRow}>
              <Text style={styles.docMetaLabel}>Quote No.</Text>
              <Text style={styles.docMetaValue}>{quote.quoteNo}</Text>
            </View>
            <View style={styles.docMetaRow}>
              <Text style={styles.docMetaLabel}>Date</Text>
              <Text style={styles.docMetaValue}>{formatPdfDate(quote.createdAt)}</Text>
            </View>
            <View style={styles.docMetaRow}>
              <Text style={styles.docMetaLabel}>Valid Until</Text>
              <Text style={styles.docMetaValue}>{formatPdfDate(validUntil)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          This is a non-binding fee estimate, not a tax invoice — final fees are confirmed once your
          requirements and documents are reviewed. Government/statutory fees are set by the relevant
          department and are subject to change without notice.
        </Text>

        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>QUOTATION FOR</Text>
            <Text style={styles.infoName}>{quote.clientName}</Text>
            <Text style={styles.infoLine}>{quote.clientPhone}</Text>
            {quote.clientEmail ? <Text style={styles.infoLine}>{quote.clientEmail}</Text> : null}
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>SERVICE REQUESTED</Text>
            <Text style={styles.infoName}>{quote.serviceName}</Text>
            {quote.stateName ? <Text style={styles.infoLine}>State: {quote.stateName}</Text> : null}
            {quote.numberOfDirectors ? (
              <Text style={styles.infoLine}>Directors/partners: {quote.numberOfDirectors}</Text>
            ) : null}
            {quote.capitalAmountPaise ? (
              <Text style={styles.infoLine}>
                Authorized capital: {formatMoneyPdfSafe(quote.capitalAmountPaise)}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colIndex, styles.headerCell]}>#</Text>
            <Text style={[styles.colDescription, styles.headerCell]}>Fee component</Text>
            <Text style={[styles.colQty, styles.headerCell]}>Qty</Text>
            <Text style={[styles.colRate, styles.headerCell]}>Rate</Text>
            <Text style={[styles.colGst, styles.headerCell]}>GST</Text>
            <Text style={[styles.colAmount, styles.headerCell]}>Amount</Text>
          </View>
          {quote.lineItems.map((item, index) => (
            <View
              // biome-ignore lint/suspicious/noArrayIndexKey: line items are a static, server-rendered snapshot that's never reordered client-side
              key={`${item.label}-${index}`}
              style={[styles.tableRow, index % 2 === 1 ? { backgroundColor: ROW_ALT } : {}]}
            >
              <Text style={[styles.colIndex, styles.cellMuted]}>{index + 1}</Text>
              <Text style={[styles.colDescription, styles.cell]}>{item.label}</Text>
              <Text style={[styles.colQty, styles.cellMuted]}>{item.qty}</Text>
              <Text style={[styles.colRate, styles.cellMuted]}>
                {formatMoneyPdfSafe(item.ratePaise)}
              </Text>
              <Text
                style={[
                  styles.colGst,
                  item.label === TAXABLE_LINE_LABEL ? styles.cell : styles.cellMuted,
                ]}
              >
                {item.label === TAXABLE_LINE_LABEL ? `${quote.gstRate}%` : "Nil"}
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
            <Text style={styles.wordsText}>{amountInWordsInr(quote.totalPaise)}</Text>
          </View>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatMoneyPdfSafe(quote.subtotalPaise)}</Text>
            </View>
            {quote.gstAmountPaise > 0 ? (
              isIntraState ? (
                <>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>CGST ({(quote.gstRate / 2).toFixed(1)}%)</Text>
                    <Text style={styles.totalsValue}>{formatMoneyPdfSafe(cgstPaise)}</Text>
                  </View>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>SGST ({(quote.gstRate / 2).toFixed(1)}%)</Text>
                    <Text style={styles.totalsValue}>{formatMoneyPdfSafe(sgstPaise)}</Text>
                  </View>
                </>
              ) : (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>
                    {quote.stateName ? `IGST (${quote.gstRate}%)` : `GST (${quote.gstRate}%)`}
                  </Text>
                  <Text style={styles.totalsValue}>{formatMoneyPdfSafe(quote.gstAmountPaise)}</Text>
                </View>
              )
            ) : null}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total Estimate</Text>
              <Text style={styles.grandTotalValue}>{formatMoneyPdfSafe(quote.totalPaise)}</Text>
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
            This is a system-generated quotation and does not require a physical signature. For
            queries regarding this estimate, please contact us at {company.phone}
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
