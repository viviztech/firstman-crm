import { describe, expect, it } from "vitest";
import { formatMoney, paiseToRupees, rupeesToPaise, sumPaise } from "@/lib/money";

describe("formatMoney", () => {
  it("renders integer paise as a rupee amount", () => {
    expect(formatMoney(150000)).toBe("₹1,500.00");
  });

  it("renders zero", () => {
    expect(formatMoney(0)).toBe("₹0.00");
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
