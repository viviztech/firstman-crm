import { describe, expect, it } from "vitest";
import { formatMoney, sumPaise } from "@/lib/money";

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
