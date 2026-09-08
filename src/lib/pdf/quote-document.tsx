import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type { QuoteLineItem } from "@/db/schema/quotes";
import { env } from "@/lib/env";
import { amountInWordsInr, formatMoney } from "@/lib/money";
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

const BRAND = "#ba2a66";
const BRAND_DEEP = "#29292d";
const BRAND_INK = "#58585b";
const BRAND_MUTED = "#f9e4ed";
const BORDER = "#e3dfe1";
const ROW_ALT = "#faf7f8";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    paddingTop: 0,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: BRAND_DEEP,
  },
  topBar: { height: 6, backgroundColor: BRAND, marginBottom: 22 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brandWordmark: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: BRAND_DEEP,
    letterSpacing: 0.3,
  },
  brandTagline: { fontSize: 8, color: BRAND, marginTop: 2, letterSpacing: 1.2 },
  companyMeta: { fontSize: 8, color: BRAND_INK, marginTop: 6, lineHeight: 1.5, maxWidth: 240 },

  docBadge: {
    borderWidth: 1,
    borderColor: BRAND,
    borderRadius: 3,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: "flex-end",
  },
  docTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: BRAND, letterSpacing: 1 },
  docMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 190,
    marginTop: 5,
  },
  docMetaLabel: { fontSize: 8, color: BRAND_INK },
  docMetaValue: { fontSize: 8, fontFamily: "Helvetica-Bold", color: BRAND_DEEP },

  disclaimer: {
    marginTop: 16,
    fontSize: 8,
    color: BRAND_INK,
    backgroundColor: BRAND_MUTED,
    padding: 8,
    borderRadius: 3,
    lineHeight: 1.4,
  },

  infoRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  infoBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 3,
    padding: 10,
  },
  infoLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: BRAND,
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  infoName: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: BRAND_DEEP },
  infoLine: { fontSize: 8.5, color: BRAND_INK, marginTop: 2 },

  table: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 3,
    overflow: "hidden",
  },
  tableHeaderRow: { flexDirection: "row", backgroundColor: BRAND_DEEP, paddingVertical: 7 },
  headerCell: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  cell: { fontSize: 8.8, color: BRAND_DEEP },
  cellMuted: { fontSize: 8, color: BRAND_INK },
  colIndex: { width: "6%", paddingLeft: 8 },
  colDescription: { width: "36%", paddingRight: 6 },
  colQty: { width: "9%", textAlign: "right" },
  colRate: { width: "16%", textAlign: "right" },
  colGst: { width: "11%", textAlign: "right" },
  colAmount: { width: "22%", textAlign: "right", paddingRight: 8 },

  totalsWrap: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  wordsBox: {
    flex: 1,
    marginRight: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 3,
    padding: 10,
    justifyContent: "center",
  },
  wordsLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: BRAND,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  wordsText: { fontSize: 9, fontFamily: "Helvetica-Oblique", color: BRAND_DEEP, lineHeight: 1.4 },

  totalsBox: { width: 210, borderWidth: 1, borderColor: BORDER, borderRadius: 3 },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  totalsLabel: { fontSize: 8.5, color: BRAND_INK },
  totalsValue: { fontSize: 8.5, color: BRAND_DEEP },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: BRAND_MUTED,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  grandTotalLabel: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: BRAND_DEEP },
  grandTotalValue: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: BRAND },

  termsSection: { marginTop: 20 },
  termsTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: BRAND,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  termRow: { flexDirection: "row", marginBottom: 3 },
  termBullet: { fontSize: 8, color: BRAND, width: 10 },
  termText: { fontSize: 8, color: BRAND_INK, flex: 1, lineHeight: 1.4 },

  footer: {
    marginTop: 26,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerNote: { fontSize: 7.5, color: BRAND_INK, maxWidth: 260, lineHeight: 1.4 },
  signatureBlock: { alignItems: "center" },
  signatureFor: { fontSize: 8, color: BRAND_INK },
  signatureLine: {
    marginTop: 26,
    width: 140,
    borderTopWidth: 1,
    borderTopColor: BRAND_INK,
    paddingTop: 4,
  },
  signatureLabel: { fontSize: 8, color: BRAND_DEEP, textAlign: "center" },

  pageFooterRule: { marginTop: 18, borderTopWidth: 1, borderTopColor: BORDER },
  pageFooterText: {
    marginTop: 6,
    fontSize: 7,
    color: BRAND_INK,
    textAlign: "center",
  },
});

function formatDate(date: Date): string {
  return formatInTimeZone(date, env.TZ_DISPLAY, "d MMM yyyy");
}

/** Splits a rounded GST amount into equal CGST/SGST halves without losing a rupee to rounding —
 *  the second half absorbs any odd paisa so the two always sum back to gstAmountPaise exactly. */
function splitEqualHalves(amountPaise: number): [number, number] {
  const half = Math.floor(amountPaise / 2);
  return [half, amountPaise - half];
}

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
  const [cgstPaise, sgstPaise] = splitEqualHalves(quote.gstAmountPaise);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topBar} fixed />

        <View style={styles.header}>
          <View>
            <Text style={styles.brandWordmark}>{company.name}</Text>
            <Text style={styles.brandTagline}>CORPORATE &amp; COMPLIANCE SERVICES</Text>
            <Text style={styles.companyMeta}>
              {company.address}
              {"\n"}GSTIN {company.gstin} · LLPIN {company.llpin}
              {"\n"}
              {company.phone}
              {company.email ? ` · ${company.email}` : ""}
            </Text>
          </View>
          <View style={styles.docBadge}>
            <Text style={styles.docTitle}>QUOTATION</Text>
            <View style={styles.docMetaRow}>
              <Text style={styles.docMetaLabel}>Quote No.</Text>
              <Text style={styles.docMetaValue}>{quote.quoteNo}</Text>
            </View>
            <View style={styles.docMetaRow}>
              <Text style={styles.docMetaLabel}>Date</Text>
              <Text style={styles.docMetaValue}>{formatDate(quote.createdAt)}</Text>
            </View>
            <View style={styles.docMetaRow}>
              <Text style={styles.docMetaLabel}>Valid Until</Text>
              <Text style={styles.docMetaValue}>{formatDate(validUntil)}</Text>
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
                Authorized capital: {formatMoney(quote.capitalAmountPaise)}
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
              <Text style={[styles.colRate, styles.cellMuted]}>{formatMoney(item.ratePaise)}</Text>
              <Text
                style={[
                  styles.colGst,
                  item.label === TAXABLE_LINE_LABEL ? styles.cell : styles.cellMuted,
                ]}
              >
                {item.label === TAXABLE_LINE_LABEL ? `${quote.gstRate}%` : "Nil"}
              </Text>
              <Text style={[styles.colAmount, styles.cell]}>{formatMoney(item.amountPaise)}</Text>
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
              <Text style={styles.totalsValue}>{formatMoney(quote.subtotalPaise)}</Text>
            </View>
            {quote.gstAmountPaise > 0 ? (
              isIntraState ? (
                <>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>CGST ({(quote.gstRate / 2).toFixed(1)}%)</Text>
                    <Text style={styles.totalsValue}>{formatMoney(cgstPaise)}</Text>
                  </View>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>SGST ({(quote.gstRate / 2).toFixed(1)}%)</Text>
                    <Text style={styles.totalsValue}>{formatMoney(sgstPaise)}</Text>
                  </View>
                </>
              ) : (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>
                    {quote.stateName ? `IGST (${quote.gstRate}%)` : `GST (${quote.gstRate}%)`}
                  </Text>
                  <Text style={styles.totalsValue}>{formatMoney(quote.gstAmountPaise)}</Text>
                </View>
              )
            ) : null}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total Estimate</Text>
              <Text style={styles.grandTotalValue}>{formatMoney(quote.totalPaise)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>TERMS &amp; NOTES</Text>
          <View style={styles.termRow}>
            <Text style={styles.termBullet}>•</Text>
            <Text style={styles.termText}>
              GST is levied only on our Professional fee — government/statutory fees, stamp duty,
              and similar pass-through components carry no GST.
            </Text>
          </View>
          <View style={styles.termRow}>
            <Text style={styles.termBullet}>•</Text>
            <Text style={styles.termText}>
              This quotation is valid for {VALIDITY_DAYS} days from the date of issue; fees may be
              revised thereafter.
            </Text>
          </View>
          <View style={styles.termRow}>
            <Text style={styles.termBullet}>•</Text>
            <Text style={styles.termText}>
              Work commences on written confirmation and receipt of the documents/details listed in
              our engagement checklist.
            </Text>
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
          {company.name} · {company.address}
        </Text>
      </Page>
    </Document>
  );
}
