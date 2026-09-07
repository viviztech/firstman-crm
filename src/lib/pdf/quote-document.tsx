import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatInTimeZone } from "date-fns-tz";
import type { QuoteLineItem } from "@/db/schema/quotes";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import type { CompanyProfile } from "@/services/company-profile";

export type QuotePdfData = {
  quoteNo: string;
  createdAt: Date;
  serviceName: string;
  stateName: string | null;
  numberOfDirectors: number | null;
  capitalAmountPaise: number | null;
  lineItems: QuoteLineItem[];
  totalPaise: number;
  clientName: string;
  clientPhone: string;
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  companyName: { fontSize: 16, fontWeight: "bold" },
  small: { fontSize: 9, color: "#555555", marginTop: 2 },
  docTitle: { fontSize: 14, fontWeight: "bold", textAlign: "right" },
  section: { marginBottom: 16 },
  label: { fontSize: 8, color: "#777777", marginBottom: 3 },
  table: {
    borderTopWidth: 1,
    borderTopColor: "#dddddd",
    borderBottomWidth: 1,
    borderBottomColor: "#dddddd",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },
  tableHeaderRow: { flexDirection: "row", paddingVertical: 6, backgroundColor: "#f5f5f5" },
  headerCell: { fontWeight: "bold" },
  colDescription: { width: "46%" },
  colQty: { width: "12%", textAlign: "right" },
  colRate: { width: "20%", textAlign: "right" },
  colAmount: { width: "22%", textAlign: "right" },
  totalsBlock: { marginTop: 12, alignItems: "flex-end" },
  grandTotalRow: {
    flexDirection: "row",
    width: 220,
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#dddddd",
  },
  bold: { fontWeight: "bold" },
});

function formatDate(date: Date): string {
  return formatInTimeZone(date, env.TZ_DISPLAY, "d MMM yyyy");
}

export function QuoteDocument({
  quote,
  company,
}: {
  quote: QuotePdfData;
  company: CompanyProfile;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{company.name}</Text>
            {company.address ? <Text style={styles.small}>{company.address}</Text> : null}
            {company.gstin ? <Text style={styles.small}>GSTIN: {company.gstin}</Text> : null}
          </View>
          <View>
            <Text style={styles.docTitle}>QUOTATION</Text>
            <Text style={styles.small}>{quote.quoteNo}</Text>
            <Text style={styles.small}>Dated {formatDate(quote.createdAt)}</Text>
          </View>
        </View>

        <Text style={[styles.small, { marginBottom: 8 }]}>
          This is an estimate, not an invoice — final fees are confirmed once your requirements and
          documents are reviewed. Government fees and stamp duty are subject to change by the
          relevant department.
        </Text>

        <View style={styles.section}>
          <Text style={styles.label}>QUOTED TO</Text>
          <Text>{quote.clientName}</Text>
          <Text style={styles.small}>{quote.clientPhone}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>SERVICE</Text>
          <Text>{quote.serviceName}</Text>
          {quote.stateName ? <Text style={styles.small}>State: {quote.stateName}</Text> : null}
          {quote.numberOfDirectors ? (
            <Text style={styles.small}>Directors/partners: {quote.numberOfDirectors}</Text>
          ) : null}
          {quote.capitalAmountPaise ? (
            <Text style={styles.small}>
              Authorized capital: {formatMoney(quote.capitalAmountPaise)}
            </Text>
          ) : null}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colDescription, styles.headerCell]}>Fee component</Text>
            <Text style={[styles.colQty, styles.headerCell]}>Qty</Text>
            <Text style={[styles.colRate, styles.headerCell]}>Rate</Text>
            <Text style={[styles.colAmount, styles.headerCell]}>Amount</Text>
          </View>
          {quote.lineItems.map((item, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: line items are a static, server-rendered snapshot that's never reordered client-side
            <View style={styles.tableRow} key={`${item.label}-${index}`}>
              <Text style={styles.colDescription}>{item.label}</Text>
              <Text style={styles.colQty}>{item.qty}</Text>
              <Text style={styles.colRate}>{formatMoney(item.ratePaise)}</Text>
              <Text style={styles.colAmount}>{formatMoney(item.amountPaise)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.grandTotalRow}>
            <Text style={styles.bold}>Total (estimate)</Text>
            <Text style={styles.bold}>{formatMoney(quote.totalPaise)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
