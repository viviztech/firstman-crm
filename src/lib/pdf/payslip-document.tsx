import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { amountInWordsInr, formatMoneyPdfSafe } from "@/lib/money";
import type { CompanyProfile } from "@/services/company-profile";

const styles = StyleSheet.create({
  page: { padding: 38, fontFamily: "Helvetica", fontSize: 9, color: "#172033" },
  bar: { height: 7, backgroundColor: "#176b8f", marginBottom: 22 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22 },
  company: { fontSize: 17, fontFamily: "Helvetica-Bold", color: "#123b5d" },
  muted: { color: "#5b6575", marginTop: 4, lineHeight: 1.4 },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", textAlign: "right" },
  panel: { backgroundColor: "#f2f7fa", padding: 13, borderRadius: 4, marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 14 },
  field: { width: "48%", marginBottom: 7 },
  label: { fontSize: 7, color: "#667085", textTransform: "uppercase", marginBottom: 2 },
  value: { fontFamily: "Helvetica-Bold" },
  columns: { flexDirection: "row", gap: 14 },
  table: { width: "50%", borderWidth: 1, borderColor: "#dbe4ea" },
  tableTitle: {
    padding: 8,
    backgroundColor: "#173c62",
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
  },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#e7edf1",
  },
  total: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 9,
    backgroundColor: "#edf4f7",
    fontFamily: "Helvetica-Bold",
  },
  net: {
    marginTop: 16,
    padding: 14,
    backgroundColor: "#e9f7ef",
    borderLeftWidth: 4,
    borderLeftColor: "#25855a",
  },
  netValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#17603d", marginTop: 3 },
  words: { marginTop: 5, color: "#44505f" },
  footer: {
    position: "absolute",
    left: 38,
    right: 38,
    bottom: 30,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#dbe4ea",
    color: "#667085",
    fontSize: 8,
  },
});

export type PayslipPdfData = {
  periodLabel: string;
  employeeName: string;
  employeeCode: string;
  designationName: string | null;
  structureName: string;
  eligibleHalfDays: number;
  paidHalfDays: number;
  grossPaise: number;
  deductionsPaise: number;
  reimbursementsPaise: number;
  netPayPaise: number;
  employerContributionsPaise: number;
  lines: Array<{
    componentName: string;
    componentType: "earning" | "deduction" | "reimbursement" | "employer_contribution";
    amountPaise: number;
  }>;
};

function days(halfDays: number) {
  return (halfDays / 2).toFixed(halfDays % 2 ? 1 : 0);
}

export function PayslipDocument({
  payslip,
  company,
}: {
  payslip: PayslipPdfData;
  company: CompanyProfile;
}) {
  const income = payslip.lines.filter(
    (line) => line.componentType === "earning" || line.componentType === "reimbursement",
  );
  const deductions = payslip.lines.filter((line) => line.componentType === "deduction");
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.bar} />
        <View style={styles.header}>
          <View style={{ width: "64%" }}>
            <Text style={styles.company}>{company.legalName}</Text>
            <Text style={styles.muted}>{company.address}</Text>
          </View>
          <View>
            <Text style={styles.title}>PAYSLIP</Text>
            <Text style={[styles.muted, { textAlign: "right" }]}>{payslip.periodLabel}</Text>
          </View>
        </View>
        <View style={styles.panel}>
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Employee</Text>
              <Text style={styles.value}>{payslip.employeeName}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Employee code</Text>
              <Text style={styles.value}>{payslip.employeeCode}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Designation</Text>
              <Text style={styles.value}>{payslip.designationName ?? "-"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Salary structure</Text>
              <Text style={styles.value}>{payslip.structureName}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Eligible days</Text>
              <Text style={styles.value}>{days(payslip.eligibleHalfDays)}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Paid days</Text>
              <Text style={styles.value}>{days(payslip.paidHalfDays)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.columns}>
          <View style={styles.table}>
            <Text style={styles.tableTitle}>EARNINGS &amp; REIMBURSEMENTS</Text>
            {income.map((line) => (
              <View style={styles.line} key={`${line.componentType}-${line.componentName}`}>
                <Text>{line.componentName}</Text>
                <Text>{formatMoneyPdfSafe(line.amountPaise)}</Text>
              </View>
            ))}
            <View style={styles.total}>
              <Text>Gross pay</Text>
              <Text>{formatMoneyPdfSafe(payslip.grossPaise)}</Text>
            </View>
          </View>
          <View style={styles.table}>
            <Text style={styles.tableTitle}>DEDUCTIONS</Text>
            {deductions.length ? (
              deductions.map((line) => (
                <View style={styles.line} key={line.componentName}>
                  <Text>{line.componentName}</Text>
                  <Text>{formatMoneyPdfSafe(line.amountPaise)}</Text>
                </View>
              ))
            ) : (
              <View style={styles.line}>
                <Text>No deductions</Text>
                <Text>{formatMoneyPdfSafe(0)}</Text>
              </View>
            )}
            <View style={styles.total}>
              <Text>Total deductions</Text>
              <Text>{formatMoneyPdfSafe(payslip.deductionsPaise)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.net}>
          <Text style={styles.label}>NET PAY</Text>
          <Text style={styles.netValue}>{formatMoneyPdfSafe(payslip.netPayPaise)}</Text>
          <Text style={styles.words}>{amountInWordsInr(payslip.netPayPaise)}</Text>
        </View>
        <Text style={styles.muted}>
          Employer contributions (not deducted from net pay):{" "}
          {formatMoneyPdfSafe(payslip.employerContributionsPaise)}
        </Text>
        <Text style={styles.footer}>
          This is a system-generated payslip and does not require a signature. Contact payroll if
          any detail is incorrect.
        </Text>
      </Page>
    </Document>
  );
}
