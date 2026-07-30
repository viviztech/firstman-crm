import { describe, expect, it } from "vitest";
import { inferDocumentKind } from "@/lib/document-kind";

describe("inferDocumentKind", () => {
  it("recognizes PAN card labels", () => {
    expect(inferDocumentKind("PAN Card of all directors/partners")).toBe("pan_card");
  });

  it("recognizes Aadhaar labels", () => {
    expect(inferDocumentKind("Aadhaar Card of all directors/partners")).toBe("aadhaar");
  });

  it("recognizes photo labels", () => {
    expect(inferDocumentKind("Passport-size photograph")).toBe("photo");
  });

  it("recognizes address proof labels, including NOC", () => {
    expect(inferDocumentKind("Address proof of registered office")).toBe("address_proof");
    expect(inferDocumentKind("NOC from property owner")).toBe("address_proof");
  });

  it("recognizes MOA/AOA labels", () => {
    expect(inferDocumentKind("Draft MOA & AOA with nominee consent")).toBe("moa_aoa");
  });

  it("recognizes certificate labels", () => {
    expect(inferDocumentKind("Bank certificate/cancelled cheque")).toBe("certificate");
  });

  it("falls back to other for anything unrecognized", () => {
    expect(inferDocumentKind("Sales register")).toBe("other");
  });
});
