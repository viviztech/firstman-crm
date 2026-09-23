import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getEmployeeBankAccount } from "@/services/hr-bank";
import { getPayrollPeriod, listPayrollYtdForPeriod } from "@/services/hr-payroll";
import { getEmployeeStatutoryDetails } from "@/services/hr-statutory";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  try {
    const { id } = await params;
    const kind = new URL(request.url).searchParams.get("kind") ?? "register";
    if (!["register", "components", "bank", "statutory", "ytd"].includes(kind))
      return NextResponse.json({ error: "Unsupported export." }, { status: 400 });
    const data = await getPayrollPeriod(id, actor);
    if (!data) return NextResponse.json({ error: "Payroll period not found." }, { status: 404 });
    let rows: unknown[][];
    if (kind === "register") {
      rows = [
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
      ];
    } else if (kind === "components") {
      const totals = new Map<
        string,
        { code: string; name: string; type: string; amountPaise: number }
      >();
      for (const entry of data.entries) {
        for (const line of entry.lines) {
          const key = `${line.componentType}:${line.componentCode}`;
          const current = totals.get(key);
          if (current) current.amountPaise += line.amountPaise;
          else
            totals.set(key, {
              code: line.componentCode,
              name: line.componentName,
              type: line.componentType,
              amountPaise: line.amountPaise,
            });
        }
      }
      rows = [
        ["Component code", "Component", "Type", "Total amount paise"],
        ...Array.from(totals.values()).map((line) => [
          line.code,
          line.name,
          line.type,
          line.amountPaise,
        ]),
      ];
    } else if (kind === "bank") {
      const details = await Promise.all(
        data.entries.map(async (entry) => ({
          entry,
          bank: await getEmployeeBankAccount(entry.employeeUserId, actor),
        })),
      );
      rows = [
        ["Employee code", "Employee", "Account holder", "Masked account", "IFSC", "Net pay paise"],
        ...details.map(({ entry, bank }) => [
          entry.employeeCode,
          entry.employeeName,
          bank?.accountHolderName ?? "",
          bank?.maskedAccountNumber ?? "",
          bank?.ifsc ?? "",
          entry.netPayPaise,
        ]),
      ];
    } else if (kind === "statutory") {
      const details = await Promise.all(
        data.entries.map(async (entry) => ({
          entry,
          statutory: await getEmployeeStatutoryDetails(entry.employeeUserId, actor),
        })),
      );
      rows = [
        [
          "Employee code",
          "Employee",
          "PAN",
          "UAN",
          "ESI number",
          "PF eligible",
          "ESI eligible",
          "Professional tax eligible",
          "Gross paise",
          "Employee deductions paise",
          "Employer contributions paise",
        ],
        ...details.map(({ entry, statutory }) => [
          entry.employeeCode,
          entry.employeeName,
          statutory?.pan ?? "Not set",
          statutory?.uan ?? "Not set",
          statutory?.esiNumber ?? "Not set",
          statutory?.pfEligible ?? false,
          statutory?.esiEligible ?? false,
          statutory?.professionalTaxEligible ?? false,
          entry.grossPaise,
          entry.deductionsPaise,
          entry.employerContributionsPaise,
        ]),
      ];
    } else {
      const ytd = await listPayrollYtdForPeriod(id, actor);
      rows = [
        [
          "Year",
          "Employee code",
          "Employee",
          "Earnings paise",
          "Reimbursements paise",
          "Gross paise",
          "Deductions paise",
          "Net pay paise",
          "Employer contributions paise",
          "Total cost paise",
        ],
        ...ytd.map((row) => [
          row.year,
          row.employeeCode,
          row.employeeName,
          row.earningsPaise,
          row.reimbursementsPaise,
          row.grossPaise,
          row.deductionsPaise,
          row.netPayPaise,
          row.employerContributionsPaise,
          row.totalCostPaise,
        ]),
      ];
    }
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
