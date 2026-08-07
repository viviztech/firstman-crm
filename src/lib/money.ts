const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

/** Renders integer paise as a ₹-formatted string. All money math elsewhere stays in paise. */
export function formatMoney(amountPaise: number): string {
  return INR_FORMATTER.format(amountPaise / 100);
}

export function sumPaise(amounts: number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}

/**
 * Storage/business logic stay in integer paise throughout (spec §2) — these two only exist at
 * the form-input boundary, where staff type and read rupees. Never used for arithmetic.
 */

/** Integer paise -> a plain rupee string for a number input's value (no ₹, no grouping). */
export function paiseToRupees(paise: number | string | null | undefined): string {
  if (paise === null || paise === undefined || paise === "") return "";
  const numeric = typeof paise === "string" ? Number(paise) : paise;
  if (!Number.isFinite(numeric)) return "";
  const rupees = numeric / 100;
  return Number.isInteger(rupees) ? String(rupees) : rupees.toFixed(2);
}

/** A rupee amount typed into a number input (e.g. "1499.5") -> integer paise, as a string ready for a hidden field. */
export function rupeesToPaise(rupees: string): string {
  const trimmed = rupees.trim();
  if (trimmed === "") return "";
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return "";
  return String(Math.round(numeric * 100));
}
