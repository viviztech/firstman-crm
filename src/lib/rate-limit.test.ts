import { beforeEach, describe, expect, it, vi } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit and reports remaining count", () => {
    const key = `test-${crypto.randomUUID()}`;
    const first = rateLimit(key, { limit: 3, windowMs: 60_000 });
    const second = rateLimit(key, { limit: 3, windowMs: 60_000 });

    expect(first).toEqual({ allowed: true, remaining: 2, resetAt: first.resetAt });
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(1);
  });

  it("blocks once the limit is exhausted within the window", () => {
    const key = `test-${crypto.randomUUID()}`;
    rateLimit(key, { limit: 2, windowMs: 60_000 });
    rateLimit(key, { limit: 2, windowMs: 60_000 });
    const third = rateLimit(key, { limit: 2, windowMs: 60_000 });

    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("resets once the window has elapsed", () => {
    const key = `test-${crypto.randomUUID()}`;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    rateLimit(key, { limit: 1, windowMs: 1000 });
    const blocked = rateLimit(key, { limit: 1, windowMs: 1000 });
    expect(blocked.allowed).toBe(false);

    vi.setSystemTime(new Date("2026-01-01T00:00:01.001Z"));
    const afterReset = rateLimit(key, { limit: 1, windowMs: 1000 });
    expect(afterReset.allowed).toBe(true);

    vi.useRealTimers();
  });

  it("tracks separate keys independently", () => {
    const keyA = `test-a-${crypto.randomUUID()}`;
    const keyB = `test-b-${crypto.randomUUID()}`;

    rateLimit(keyA, { limit: 1, windowMs: 60_000 });
    const resultB = rateLimit(keyB, { limit: 1, windowMs: 60_000 });

    expect(resultB.allowed).toBe(true);
  });
});
