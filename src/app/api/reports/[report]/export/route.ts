import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import type { Role } from "@/lib/auth";
import { COMPLIANCE_STATUS_BADGE, LEAD_SOURCE_LABEL } from "@/lib/badges";
import {
  getAgingReceivables,
  getComplianceFilingStatus,
  getConversionRateByExecutive,
  getLeadSourcePerformance,
  getRevenueByService,
  summarizeAgingBuckets,
} from "@/services/reports";

const CAN_VIEW_REPORTS: Role[] = ["super_admin", "manager", "accountant"];

const MONEY_FORMAT = '"₹"#,##0.00';
const PERCENT_FORMAT = "0.0%";

const REPORT_KEYS = [
  "leads-by-source",
  "conversion-rate",
  "revenue-by-service",
  "aging-receivables",
  "compliance-status",
] as const;
type ReportKey = (typeof REPORT_KEYS)[number];

function isReportKey(value: string): value is ReportKey {
  return (REPORT_KEYS as readonly string[]).includes(value);
}

async function buildWorkbook(reportKey: ReportKey): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();

  if (reportKey === "leads-by-source") {
    const rows = await getLeadSourcePerformance();
    const sheet = workbook.addWorksheet("Lead source performance");
    sheet.columns = [
      { header: "Source", key: "source", width: 18 },
      { header: "Total leads", key: "total", width: 14 },
      { header: "Won", key: "won", width: 10 },
      { header: "Lost", key: "lost", width: 10 },
      { header: "Conversion rate", key: "conversionRate", width: 16 },
    ];
    for (const row of rows) {
      sheet.addRow({
        source: LEAD_SOURCE_LABEL[row.source],
        total: row.total,
        won: row.won,
        lost: row.lost,
        conversionRate: row.conversionRate,
      });
    }
    sheet.getColumn("conversionRate").numFmt = PERCENT_FORMAT;
  }

  if (reportKey === "conversion-rate") {
    const bySource = await getLeadSourcePerformance();
    const byExecutive = await getConversionRateByExecutive();

    const sourceSheet = workbook.addWorksheet("By source");
    sourceSheet.columns = [
      { header: "Source", key: "source", width: 18 },
      { header: "Total leads", key: "total", width: 14 },
      { header: "Won", key: "won", width: 10 },
      { header: "Conversion rate", key: "conversionRate", width: 16 },
    ];
    for (const row of bySource) {
      sourceSheet.addRow({
        source: LEAD_SOURCE_LABEL[row.source],
        total: row.total,
        won: row.won,
        conversionRate: row.conversionRate,
      });
    }
    sourceSheet.getColumn("conversionRate").numFmt = PERCENT_FORMAT;

    const execSheet = workbook.addWorksheet("By executive");
    execSheet.columns = [
      { header: "Executive", key: "executiveName", width: 22 },
      { header: "Total leads", key: "total", width: 14 },
      { header: "Won", key: "won", width: 10 },
      { header: "Conversion rate", key: "conversionRate", width: 16 },
    ];
    for (const row of byExecutive) {
      execSheet.addRow({
        executiveName: row.executiveName,
        total: row.total,
        won: row.won,
        conversionRate: row.conversionRate,
      });
    }
    execSheet.getColumn("conversionRate").numFmt = PERCENT_FORMAT;
  }

  if (reportKey === "revenue-by-service") {
    const rows = await getRevenueByService();
    const sheet = workbook.addWorksheet("Revenue by service");
    sheet.columns = [
      { header: "Service", key: "serviceName", width: 32 },
      { header: "Orders", key: "orderCount", width: 12 },
      { header: "Quoted revenue", key: "totalPaise", width: 18 },
    ];
    for (const row of rows) {
      sheet.addRow({
        serviceName: row.serviceName,
        orderCount: row.orderCount,
        totalPaise: row.totalPaise / 100,
      });
    }
    sheet.getColumn("totalPaise").numFmt = MONEY_FORMAT;
  }

  if (reportKey === "aging-receivables") {
    const rows = await getAgingReceivables();
    const summary = summarizeAgingBuckets(rows);

    const summarySheet = workbook.addWorksheet("Summary by bucket");
    summarySheet.columns = [
      { header: "Bucket", key: "bucket", width: 14 },
      { header: "Invoices", key: "count", width: 12 },
      { header: "Balance due", key: "totalPaise", width: 18 },
    ];
    for (const row of summary) {
      summarySheet.addRow({
        bucket: row.bucket,
        count: row.count,
        totalPaise: row.totalPaise / 100,
      });
    }
    summarySheet.getColumn("totalPaise").numFmt = MONEY_FORMAT;

    const detailSheet = workbook.addWorksheet("Invoice detail");
    detailSheet.columns = [
      { header: "Invoice #", key: "invoiceNo", width: 18 },
      { header: "Client", key: "clientName", width: 24 },
      { header: "Due date", key: "dueDate", width: 14 },
      { header: "Days past due", key: "daysPastDue", width: 14 },
      { header: "Bucket", key: "bucket", width: 12 },
      { header: "Balance due", key: "balancePaise", width: 16 },
    ];
    for (const row of rows) {
      detailSheet.addRow({
        invoiceNo: row.invoiceNo,
        clientName: row.clientName,
        dueDate: row.dueDate.toISOString().slice(0, 10),
        daysPastDue: row.daysPastDue,
        bucket: row.bucket,
        balancePaise: row.balancePaise / 100,
      });
    }
    detailSheet.getColumn("balancePaise").numFmt = MONEY_FORMAT;
  }

  if (reportKey === "compliance-status") {
    const rows = await getComplianceFilingStatus();
    const sheet = workbook.addWorksheet("Compliance filing status");
    sheet.columns = [
      { header: "Status", key: "status", width: 18 },
      { header: "Count", key: "count", width: 12 },
    ];
    for (const row of rows) {
      sheet.addRow({ status: COMPLIANCE_STATUS_BADGE[row.status].label, count: row.count });
    }
  }

  for (const sheet of workbook.worksheets) {
    sheet.getRow(1).font = { bold: true };
  }

  return workbook;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ report: string }> },
): Promise<NextResponse> {
  const user = await getApiUser();
  if (!user || !CAN_VIEW_REPORTS.includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { report } = await params;
  if (!isReportKey(report)) {
    return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  }

  const workbook = await buildWorkbook(report);
  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${report}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
