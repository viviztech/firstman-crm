import { describe, expect, it } from "vitest";
import { calculatePayroll, summarizePayrollYtd } from "@/services/hr-payroll-calculator";

const components = [
  {
    code: "BASIC",
    name: "Basic",
    type: "earning" as const,
    calculationMode: "fixed" as const,
    amountPaise: 3000000,
    rateBasisPoints: null,
    displayOrder: 1,
  },
  {
    code: "HRA",
    name: "HRA",
    type: "earning" as const,
    calculationMode: "percent_of_basic" as const,
    amountPaise: null,
    rateBasisPoints: 4000,
    displayOrder: 2,
  },
  {
    code: "PF",
    name: "PF",
    type: "deduction" as const,
    calculationMode: "percent_of_basic" as const,
    amountPaise: null,
    rateBasisPoints: 1200,
    displayOrder: 3,
  },
  {
    code: "INTERNET",
    name: "Internet",
    type: "reimbursement" as const,
    calculationMode: "fixed" as const,
    amountPaise: 100000,
    rateBasisPoints: null,
    displayOrder: 4,
  },
];

describe("calculatePayroll", () => {
  it("prorates salary, keeps reimbursement whole, and reconciles net pay", () => {
    const result = calculatePayroll({ components, eligibleHalfDays: 60, paidHalfDays: 30 });
    expect(result.grossPaise).toBe(2200000);
    expect(result.deductionsPaise).toBe(180000);
    expect(result.reimbursementsPaise).toBe(100000);
    expect(result.netPayPaise).toBe(2020000);
  });

  it("adds adjustments according to their component type", () => {
    const result = calculatePayroll({
      components,
      eligibleHalfDays: 60,
      paidHalfDays: 60,
      adjustments: [
        { code: "BONUS", name: "Bonus", type: "earning", amountPaise: 50000, displayOrder: 9 },
      ],
    });
    expect(result.grossPaise).toBe(4350000);
    expect(result.netPayPaise).toBe(3990000);
  });

  it("combines opening and processed lines into reconciled YTD totals", () => {
    expect(
      summarizePayrollYtd([
        { type: "earning", amountPaise: 1_000_000 },
        { type: "reimbursement", amountPaise: 50_000 },
        { type: "deduction", amountPaise: 120_000 },
        { type: "employer_contribution", amountPaise: 120_000 },
      ]),
    ).toEqual({
      earningsPaise: 1_000_000,
      deductionsPaise: 120_000,
      reimbursementsPaise: 50_000,
      employerContributionsPaise: 120_000,
      grossPaise: 1_050_000,
      netPayPaise: 930_000,
      totalCostPaise: 1_170_000,
    });
  });
});
