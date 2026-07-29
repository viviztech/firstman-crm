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
