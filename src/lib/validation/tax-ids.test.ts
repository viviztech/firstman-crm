import { describe, expect, it } from "vitest";
import { optionalGstinSchema, optionalPanSchema } from "@/lib/validation/tax-ids";

describe("optionalGstinSchema", () => {
  it("accepts a valid GSTIN and uppercases it", () => {
    expect(optionalGstinSchema.parse("27aacfm1234a1z5")).toBe("27AACFM1234A1Z5");
  });

  it("treats an empty string as undefined", () => {
    expect(optionalGstinSchema.parse("")).toBeUndefined();
  });

  it("rejects a malformed GSTIN", () => {
    expect(() => optionalGstinSchema.parse("not-a-gstin")).toThrow();
  });
});

describe("optionalPanSchema", () => {
  it("accepts a valid PAN and uppercases it", () => {
    expect(optionalPanSchema.parse("aaacp9876d")).toBe("AAACP9876D");
  });

  it("treats an empty string as undefined", () => {
    expect(optionalPanSchema.parse("")).toBeUndefined();
  });

  it("rejects a malformed PAN", () => {
    expect(() => optionalPanSchema.parse("12345ABCDE")).toThrow();
  });
});
