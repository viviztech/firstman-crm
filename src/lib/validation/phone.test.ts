import { describe, expect, it } from "vitest";
import { indianPhoneSchema } from "@/lib/validation/phone";

describe("indianPhoneSchema", () => {
  it("normalizes a bare 10-digit mobile number", () => {
    expect(indianPhoneSchema.parse("9876543210")).toBe("+919876543210");
  });

  it("normalizes a number already prefixed with +91", () => {
    expect(indianPhoneSchema.parse("+91 98765 43210")).toBe("+919876543210");
  });

  it("normalizes a number prefixed with a bare 91", () => {
    expect(indianPhoneSchema.parse("919876543210")).toBe("+919876543210");
  });

  it("normalizes a number prefixed with a trunk 0", () => {
    expect(indianPhoneSchema.parse("09876543210")).toBe("+919876543210");
  });

  it("strips spaces and hyphens", () => {
    expect(indianPhoneSchema.parse("98765-43210")).toBe("+919876543210");
  });

  it("rejects numbers not starting with 6-9", () => {
    expect(() => indianPhoneSchema.parse("5876543210")).toThrow();
  });

  it("rejects numbers with the wrong length", () => {
    expect(() => indianPhoneSchema.parse("98765432")).toThrow();
  });

  it("rejects non-numeric input", () => {
    expect(() => indianPhoneSchema.parse("not-a-phone")).toThrow();
  });
});
