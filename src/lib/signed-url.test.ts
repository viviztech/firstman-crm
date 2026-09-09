import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDownloadToken,
  createQuotePdfToken,
  createQuoteResponseToken,
  getDocumentDownloadUrl,
  getQuoteResponseUrl,
  verifyDownloadToken,
  verifyQuoteResponseToken,
} from "@/lib/signed-url";

describe("signed-url", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("verifies a freshly-created token for the same document id", () => {
    const token = createDownloadToken("doc-1");
    expect(verifyDownloadToken("doc-1", token)).toBe(true);
  });

  it("rejects the token for a different document id", () => {
    const token = createDownloadToken("doc-1");
    expect(verifyDownloadToken("doc-2", token)).toBe(false);
  });

  it("rejects an expired token", () => {
    const token = createDownloadToken("doc-1");
    vi.setSystemTime(new Date("2026-01-01T00:10:00Z")); // 10 minutes later, past the 5-minute expiry
    expect(verifyDownloadToken("doc-1", token)).toBe(false);
  });

  it("accepts a token right up to the expiry boundary", () => {
    const token = createDownloadToken("doc-1");
    vi.setSystemTime(new Date("2026-01-01T00:04:59Z"));
    expect(verifyDownloadToken("doc-1", token)).toBe(true);
  });

  it("rejects a tampered signature", () => {
    const token = createDownloadToken("doc-1");
    const [expiresAt] = token.split(".");
    const tampered = `${expiresAt}.0000000000000000000000000000000000000000000000000000000000000000`;
    expect(verifyDownloadToken("doc-1", tampered)).toBe(false);
  });

  it("rejects malformed tokens", () => {
    expect(verifyDownloadToken("doc-1", "not-a-token")).toBe(false);
    expect(verifyDownloadToken("doc-1", "")).toBe(false);
  });

  it("builds a download URL containing the route and a token query param", () => {
    const url = getDocumentDownloadUrl("doc-1");
    expect(url).toMatch(/^\/api\/documents\/doc-1\/download\?token=\d+\.[0-9a-f]+$/);
  });
});

describe("quote-response token", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("verifies a freshly-created token for the same quote id", () => {
    const token = createQuoteResponseToken("quote-1");
    expect(verifyQuoteResponseToken("quote-1", token)).toBe(true);
  });

  it("rejects the token for a different quote id", () => {
    const token = createQuoteResponseToken("quote-1");
    expect(verifyQuoteResponseToken("quote-2", token)).toBe(false);
  });

  it("rejects an expired token (30-day window)", () => {
    const token = createQuoteResponseToken("quote-1");
    vi.setSystemTime(new Date("2026-02-01T00:00:01Z"));
    expect(verifyQuoteResponseToken("quote-1", token)).toBe(false);
  });

  it("rejects malformed tokens", () => {
    expect(verifyQuoteResponseToken("quote-1", "not-a-token")).toBe(false);
    expect(verifyQuoteResponseToken("quote-1", "")).toBe(false);
  });

  it("builds a response URL containing the route and a token query param", () => {
    const url = getQuoteResponseUrl("quote-1");
    expect(url).toMatch(/^\/quotes\/quote-1\/respond\?token=\d+\.[0-9a-f]+$/);
  });

  it("never accepts a quote PDF token on the response route — distinct prefixes isolate the two", () => {
    const pdfToken = createQuotePdfToken("quote-1");
    expect(verifyQuoteResponseToken("quote-1", pdfToken)).toBe(false);
  });
});
