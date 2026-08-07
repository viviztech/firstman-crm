import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatInTimeZone } from "date-fns-tz";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import type { CompanyProfile } from "@/services/company-profile";

export type JobCardPdfData = {
  orderNo: string;
  status: string;
  startedAt: Date;
  dueAt: Date;
  quotedPricePaise: number;
  govtFeePaise: number | null;
  notes: string | null;
  client: { name: string; phone: string };
  service: { name: string };
  assignee: { name: string } | null;
  tasks: { title: string; status: string; dueAt: Date | null; assignee: { name: string } | null }[];
  documents: { label: string; status: string }[];
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  companyName: { fontSize: 16, fontWeight: "bold" },
  small: { fontSize: 9, color: "#555555", marginTop: 2 },
  docTitle: { fontSize: 14, fontWeight: "bold", textAlign: "right" },
  section: { marginBottom: 16 },
  label: { fontSize: 8, color: "#777777", marginBottom: 3 },
  grid: { flexDirection: "row", justifyContent: "space-between" },
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
  colTitle: { width: "46%" },
  colStatus: { width: "18%" },
  colDue: { width: "18%" },
  colAssignee: { width: "18%" },
  colDocLabel: { width: "70%" },
  colDocStatus: { width: "30%" },
  sectionTitle: { fontSize: 11, fontWeight: "bold", marginBottom: 6 },
  bold: { fontWeight: "bold" },
});

function formatDate(date: Date): string {
  return formatInTimeZone(date, env.TZ_DISPLAY, "d MMM yyyy");
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export function JobCardDocument({
  order,
  company,
}: {
  order: JobCardPdfData;
  company: CompanyProfile;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{company.name}</Text>
            {company.address ? <Text style={styles.small}>{company.address}</Text> : null}
          </View>
          <View>
            <Text style={styles.docTitle}>JOB CARD</Text>
            <Text style={styles.small}>{order.orderNo}</Text>
            <Text style={styles.small}>Status: {formatStatusLabel(order.status)}</Text>
          </View>
        </View>

        <View style={[styles.section, styles.grid]}>
          <View>
            <Text style={styles.label}>CLIENT</Text>
            <Text>{order.client.name}</Text>
            <Text style={styles.small}>{order.client.phone}</Text>
          </View>
          <View>
            <Text style={styles.label}>SERVICE</Text>
            <Text>{order.service.name}</Text>
            <Text style={styles.small}>Assigned to: {order.assignee?.name ?? "Unassigned"}</Text>
          </View>
          <View>
            <Text style={styles.label}>TIMELINE</Text>
            <Text style={styles.small}>Started: {formatDate(order.startedAt)}</Text>
            <Text style={styles.small}>Due: {formatDate(order.dueAt)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>PRICING (internal — not for client circulation)</Text>
          <Text style={styles.small}>Quoted: {formatMoney(order.quotedPricePaise)}</Text>
          <Text style={styles.small}>
            Govt. fee: {order.govtFeePaise ? formatMoney(order.govtFeePaise) : "—"}
          </Text>
        </View>

        {order.notes ? (
          <View style={styles.section}>
            <Text style={styles.label}>NOTES</Text>
            <Text style={styles.small}>{order.notes}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Task checklist</Text>
          {order.tasks.length === 0 ? (
            <Text style={styles.small}>No tasks generated for this service.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.colTitle, styles.headerCell]}>Task</Text>
                <Text style={[styles.colStatus, styles.headerCell]}>Status</Text>
                <Text style={[styles.colDue, styles.headerCell]}>Due</Text>
                <Text style={[styles.colAssignee, styles.headerCell]}>Assignee</Text>
              </View>
              {order.tasks.map((task, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static server-rendered snapshot, never reordered client-side
                <View style={styles.tableRow} key={`${task.title}-${index}`}>
                  <Text style={styles.colTitle}>{task.title}</Text>
                  <Text style={styles.colStatus}>{formatStatusLabel(task.status)}</Text>
                  <Text style={styles.colDue}>{task.dueAt ? formatDate(task.dueAt) : "—"}</Text>
                  <Text style={styles.colAssignee}>{task.assignee?.name ?? "—"}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Document checklist</Text>
          {order.documents.length === 0 ? (
            <Text style={styles.small}>No documents required for this service.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.colDocLabel, styles.headerCell]}>Document</Text>
                <Text style={[styles.colDocStatus, styles.headerCell]}>Status</Text>
              </View>
              {order.documents.map((document, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static server-rendered snapshot, never reordered client-side
                <View style={styles.tableRow} key={`${document.label}-${index}`}>
                  <Text style={styles.colDocLabel}>{document.label}</Text>
                  <Text style={styles.colDocStatus}>{formatStatusLabel(document.status)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
