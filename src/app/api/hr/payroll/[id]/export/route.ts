import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getPayrollPeriod } from "@/services/hr-payroll";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  try {
    const { id } = await params;
    const kind = new URL(request.url).searchParams.get("kind") ?? "register";
    if (kind !== "register" && kind !== "components")
      return NextResponse.json({ error: "Unsupported export." }, { status: 400 });
    const data = await getPayrollPeriod(id, actor);
    if (!data) return NextResponse.json({ error: "Payroll period not found." }, { status: 404 });
    const rows =
      kind === "register"
        ? [
            [
              "Employee code",
              "Employee",
              "Eligible days",
              "Paid days",
              "Gross paise",
              "Deductions paise",
              "Reimbursements paise",
              "Net pay paise",
              "Employer contributions paise",
              "Total cost paise",
            ],
            ...data.entries.map((entry) => [
              entry.employeeCode,
              entry.employeeName,
              entry.eligibleHalfDays / 2,
              entry.paidHalfDays / 2,
              entry.grossPaise,
              entry.deductionsPaise,
              entry.reimbursementsPaise,
              entry.netPayPaise,
              entry.employerContributionsPaise,
              entry.totalCostPaise,
            ]),
          ]
        : [
            ["Employee code", "Employee", "Component code", "Component", "Type", "Amount paise"],
            ...data.entries.flatMap((entry) =>
              entry.lines.map((line) => [
                entry.employeeCode,
                entry.employeeName,
                line.componentCode,
                line.componentName,
                line.componentType,
                line.amountPaise,
              ]),
            ),
          ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="payroll-${data.period.periodMonth.slice(0, 7)}-${kind}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to export payroll." },
      { status: 403 },
    );
  }
}
