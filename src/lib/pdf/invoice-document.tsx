import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatInTimeZone } from "date-fns-tz";
import type { InvoiceLineItem, invoiceKindEnum } from "@/db/schema/invoices";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import type { CompanyProfile } from "@/services/company-profile";

export type InvoicePdfData = {
  invoiceNo: string;
  kind: (typeof invoiceKindEnum.enumValues)[number];
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
  totalsRow: {
    flexDirection: "row",
    width: 220,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  totalsLabel: { color: "#555555" },
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

export function InvoiceDocument({
  invoice,
  company,
}: {
  invoice: InvoicePdfData;
  company: CompanyProfile;
}) {
  const clientAddressLine = [invoice.client.address, invoice.client.city, invoice.client.state]
    .filter(Boolean)
    .join(", ");

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
            <Text style={styles.docTitle}>
              {invoice.kind === "proforma" ? "PROFORMA INVOICE" : "TAX INVOICE"}
            </Text>
            <Text style={styles.small}>{invoice.invoiceNo}</Text>
            <Text style={styles.small}>Due {formatDate(invoice.dueDate)}</Text>
            {invoice.order ? <Text style={styles.small}>Order {invoice.order.orderNo}</Text> : null}
          </View>
        </View>
        {invoice.kind === "proforma" ? (
          <Text style={[styles.small, { marginBottom: 8 }]}>
            This is an advance-payment request, not a tax invoice. A GST tax invoice will follow
            once the order is complete and this amount is paid in full.
          </Text>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.label}>BILLED TO</Text>
          <Text>{invoice.client.name}</Text>
          {clientAddressLine ? <Text style={styles.small}>{clientAddressLine}</Text> : null}
          <Text style={styles.small}>{invoice.client.phone}</Text>
          {invoice.client.gstin ? (
            <Text style={styles.small}>GSTIN: {invoice.client.gstin}</Text>
          ) : null}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colDescription, styles.headerCell]}>Description</Text>
            <Text style={[styles.colQty, styles.headerCell]}>Qty</Text>
            <Text style={[styles.colRate, styles.headerCell]}>Rate</Text>
            <Text style={[styles.colAmount, styles.headerCell]}>Amount</Text>
          </View>
          {invoice.lineItems.map((item, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: line items are a static, server-rendered snapshot that's never reordered client-side
            <View style={styles.tableRow} key={`${item.description}-${index}`}>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colQty}>{item.qty}</Text>
              <Text style={styles.colRate}>{formatMoney(item.ratePaise)}</Text>
              <Text style={styles.colAmount}>{formatMoney(item.amountPaise)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text>{formatMoney(invoice.subtotalPaise)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>GST ({invoice.gstRate}%)</Text>
            <Text>{formatMoney(invoice.gstAmountPaise)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.bold}>Total</Text>
            <Text style={styles.bold}>{formatMoney(invoice.totalPaise)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
