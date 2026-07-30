import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDownloadToken, getDocumentDownloadUrl, verifyDownloadToken } from "@/lib/signed-url";

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
