import { describe, expect, it } from "vitest";
import {
  amountInWordsInr,
  formatMoney,
  formatMoneyPdfSafe,
  paiseToRupees,
  rupeesToPaise,
  sumPaise,
} from "@/lib/money";

describe("formatMoney", () => {
  it("renders integer paise as a rupee amount", () => {
    expect(formatMoney(150000)).toBe("₹1,500.00");
  });

  it("renders zero", () => {
    expect(formatMoney(0)).toBe("₹0.00");
  });
});

describe("formatMoneyPdfSafe", () => {
  it("renders integer paise with an ASCII 'Rs.' prefix instead of the ₹ glyph", () => {
    expect(formatMoneyPdfSafe(150000)).toBe("Rs. 1,500.00");
  });

  it("renders zero", () => {
    expect(formatMoneyPdfSafe(0)).toBe("Rs. 0.00");
  });

  it("groups lakhs the Indian way, matching formatMoney's grouping", () => {
    expect(formatMoneyPdfSafe(1315000_00)).toBe("Rs. 13,15,000.00");
  });

  it("never contains the ₹ Unicode character", () => {
    expect(formatMoneyPdfSafe(99999900)).not.toContain("₹");
  });
});

describe("sumPaise", () => {
  it("sums many odd paise amounts without float drift", () => {
    const amounts = Array.from({ length: 1000 }, () => 1);
    expect(sumPaise(amounts)).toBe(1000);
  });

  it("matches manual addition for a realistic invoice", () => {
    const lineItems = [33333, 66667, 1];
    expect(sumPaise(lineItems)).toBe(100001);
  });
});

describe("paiseToRupees", () => {
  it("renders a whole-rupee amount with no decimals", () => {
    expect(paiseToRupees(150000)).toBe("1500");
  });

  it("renders a fractional-rupee amount to exactly 2 decimals", () => {
    expect(paiseToRupees(149999)).toBe("1499.99");
    expect(paiseToRupees(100001)).toBe("1000.01");
  });

  it("renders empty/null/undefined as an empty string", () => {
    expect(paiseToRupees(null)).toBe("");
    expect(paiseToRupees(undefined)).toBe("");
    expect(paiseToRupees("")).toBe("");
  });

  it("accepts a numeric string, as read back from a hidden form field", () => {
    expect(paiseToRupees("250000")).toBe("2500");
  });
});

describe("rupeesToPaise", () => {
  it("converts a whole-rupee amount", () => {
    expect(rupeesToPaise("1500")).toBe("150000");
  });

  it("converts a fractional-rupee amount without float drift", () => {
    expect(rupeesToPaise("1499.99")).toBe("149999");
    expect(rupeesToPaise("19.99")).toBe("1999");
  });

  it("rounds a third decimal place rather than truncating", () => {
    expect(rupeesToPaise("10.005")).toBe("1001"); // 1000.5 -> rounds up
  });

  it("returns an empty string for empty or non-numeric input", () => {
    expect(rupeesToPaise("")).toBe("");
    expect(rupeesToPaise("   ")).toBe("");
    expect(rupeesToPaise("abc")).toBe("");
  });

  it("round-trips with paiseToRupees for a range of realistic amounts", () => {
    for (const paise of [0, 1, 99, 100, 14999900, 176882]) {
      expect(rupeesToPaise(paiseToRupees(paise))).toBe(String(paise));
    }
  });
});

describe("amountInWordsInr", () => {
  it("renders zero", () => {
    expect(amountInWordsInr(0)).toBe("Rupees Zero Only");
  });

  it("renders a whole-rupee amount with no paise clause", () => {
    expect(amountInWordsInr(150000)).toBe("Rupees One Thousand Five Hundred Only");
  });

  it("renders paise as a separate clause", () => {
    expect(amountInWordsInr(150050)).toBe("Rupees One Thousand Five Hundred and Fifty Paise Only");
  });

  it("uses Indian numbering — lakh and crore, not million/billion", () => {
    expect(amountInWordsInr(100000_00)).toBe("Rupees One Lakh Only");
    expect(amountInWordsInr(12345678_00)).toBe(
      "Rupees One Crore Twenty-Three Lakh Forty-Five Thousand Six Hundred Seventy-Eight Only",
    );
  });

  it("handles teens and compound tens correctly", () => {
    expect(amountInWordsInr(19_00)).toBe("Rupees Nineteen Only");
    expect(amountInWordsInr(21_00)).toBe("Rupees Twenty-One Only");
    expect(amountInWordsInr(1315000_00)).toBe("Rupees Thirteen Lakh Fifteen Thousand Only");
  });

  it("prefixes a negative amount with Minus", () => {
    expect(amountInWordsInr(-150000)).toBe("Minus Rupees One Thousand Five Hundred Only");
  });
});
