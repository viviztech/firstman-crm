export type PayrollComponentInput = {
  code: string;
  name: string;
  type: "earning" | "deduction" | "reimbursement" | "employer_contribution";
  calculationMode: "fixed" | "percent_of_basic";
  amountPaise: number | null;
  rateBasisPoints: number | null;
  displayOrder: number;
};

export type PayrollLine = Pick<PayrollComponentInput, "code" | "name" | "type" | "displayOrder"> & {
  amountPaise: number;
};

export type PayrollYtdTotals = {
  earningsPaise: number;
  deductionsPaise: number;
  reimbursementsPaise: number;
  employerContributionsPaise: number;
  grossPaise: number;
  netPayPaise: number;
  totalCostPaise: number;
};

export function summarizePayrollYtd(
  lines: Array<{ type: PayrollLine["type"]; amountPaise: number }>,
): PayrollYtdTotals {
  const totals: PayrollYtdTotals = {
    earningsPaise: 0,
    deductionsPaise: 0,
    reimbursementsPaise: 0,
    employerContributionsPaise: 0,
    grossPaise: 0,
    netPayPaise: 0,
    totalCostPaise: 0,
  };
  for (const line of lines) {
    if (line.type === "earning") totals.earningsPaise += line.amountPaise;
    else if (line.type === "deduction") totals.deductionsPaise += line.amountPaise;
    else if (line.type === "reimbursement") totals.reimbursementsPaise += line.amountPaise;
    else totals.employerContributionsPaise += line.amountPaise;
  }
  totals.grossPaise = totals.earningsPaise + totals.reimbursementsPaise;
  totals.netPayPaise = totals.grossPaise - totals.deductionsPaise;
  totals.totalCostPaise = totals.grossPaise + totals.employerContributionsPaise;
  return totals;
}

export function calculatePayroll(input: {
  components: PayrollComponentInput[];
  adjustments?: Array<PayrollLine>;
  eligibleHalfDays: number;
  paidHalfDays: number;
}) {
  if (input.eligibleHalfDays < 0 || input.paidHalfDays < 0) {
    throw new Error("Payroll day units cannot be negative.");
  }
  const factor = input.eligibleHalfDays
    ? Math.min(input.paidHalfDays, input.eligibleHalfDays) / input.eligibleHalfDays
    : 0;
  const basic = input.components.find((component) => component.code.toUpperCase() === "BASIC");
  const basicMonthly = basic?.amountPaise ?? 0;
  const lines: PayrollLine[] = input.components.map((component) => {
    const monthly =
      component.calculationMode === "percent_of_basic"
        ? Math.round((basicMonthly * (component.rateBasisPoints ?? 0)) / 10_000)
        : (component.amountPaise ?? 0);
    const prorated = component.type === "reimbursement" ? monthly : Math.round(monthly * factor);
    return { ...component, amountPaise: prorated };
  });
  for (const adjustment of input.adjustments ?? []) {
    const existing = lines.find(
      (line) => line.code === adjustment.code && line.type === adjustment.type,
    );
    if (existing) existing.amountPaise += adjustment.amountPaise;
    else lines.push({ ...adjustment });
  }
  const total = (type: PayrollLine["type"]) =>
    lines.filter((line) => line.type === type).reduce((sum, line) => sum + line.amountPaise, 0);
  const earningsPaise = total("earning");
  const deductionsPaise = total("deduction");
  const reimbursementsPaise = total("reimbursement");
  const grossPaise = earningsPaise + reimbursementsPaise;
  const employerContributionsPaise = total("employer_contribution");
  const netPayPaise = grossPaise - deductionsPaise;
  const validationMessages: string[] = [];
  if (!basic) validationMessages.push("BASIC component is missing.");
  if (grossPaise < 0) validationMessages.push("Gross pay cannot be negative.");
  if (netPayPaise < 0) validationMessages.push("Net pay cannot be negative.");
  if (input.paidHalfDays > input.eligibleHalfDays)
    validationMessages.push("Paid days exceed eligible days.");
  return {
    lines: lines.sort((a, b) => a.displayOrder - b.displayOrder),
    grossPaise,
    deductionsPaise,
    reimbursementsPaise,
    netPayPaise,
    employerContributionsPaise,
    totalCostPaise: grossPaise + employerContributionsPaise,
    validationStatus: validationMessages.length ? ("warning" as const) : ("valid" as const),
    validationMessages,
  };
}
