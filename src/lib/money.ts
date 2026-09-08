const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

/** Renders integer paise as a ₹-formatted string. All money math elsewhere stays in paise. */
export function formatMoney(amountPaise: number): string {
  return INR_FORMATTER.format(amountPaise / 100);
}

const INR_GROUPING_FORMATTER = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Same lakh/crore grouping and rounding as formatMoney, but "Rs." instead of the ₹ (U+20B9)
 * glyph — the base14 Helvetica fonts @react-pdf/renderer ships (WinAnsi encoding) don't include
 * the Rupee sign, so it prints as a stray "¹"/tofu character in PDFs. Use this instead of
 * formatMoney anywhere money is rendered inside a react-pdf document.
 */
export function formatMoneyPdfSafe(amountPaise: number): string {
  return `Rs. ${INR_GROUPING_FORMATTER.format(amountPaise / 100)}`;
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

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigitsToWords(n: number): string {
  if (n < 20) return ONES[n] ?? "";
  const tens = TENS[Math.floor(n / 10)] ?? "";
  const ones = ONES[n % 10];
  return ones ? `${tens}-${ones}` : tens;
}

function threeDigitsToWords(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) parts.push(twoDigitsToWords(rest));
  return parts.join(" ");
}

/** Indian numbering system (crore/lakh/thousand), not the Western one — a bare integer, no currency word. */
function integerToIndianWords(value: number): string {
  if (value === 0) return "Zero";
  const crore = Math.floor(value / 10000000);
  const lakh = Math.floor((value % 10000000) / 100000);
  const thousand = Math.floor((value % 100000) / 1000);
  const rest = value % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigitsToWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitsToWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitsToWords(thousand)} Thousand`);
  if (rest) parts.push(threeDigitsToWords(rest));
  return parts.join(" ");
}

/** Integer paise -> "Rupees ... Paise Only", Indian numbering — for the amount-in-words line on printed documents. */
export function amountInWordsInr(amountPaise: number): string {
  const rupees = Math.floor(Math.abs(amountPaise) / 100);
  const paise = Math.abs(amountPaise) % 100;
  const sign = amountPaise < 0 ? "Minus " : "";

  const rupeeWords = `Rupees ${integerToIndianWords(rupees)}`;
  const paiseWords = paise ? ` and ${integerToIndianWords(paise)} Paise` : "";
  return `${sign}${rupeeWords}${paiseWords} Only`;
}
