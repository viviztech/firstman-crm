type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let callsSinceSweep = 0;

export type RateLimitResult = { allowed: boolean; remaining: number; resetAt: number };

/**
 * In-memory fixed-window limiter, fine for a single Coolify container. If this app ever runs
 * multiple instances, swap for a Postgres- or Redis-backed limiter — an in-process Map won't
 * share state across processes.
 */
export function rateLimit(key: string, opts: { limit: number; windowMs: number }): RateLimitResult {
  const now = Date.now();

  callsSinceSweep += 1;
  if (callsSinceSweep >= 1000) {
    callsSinceSweep = 0;
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: opts.limit - 1, resetAt };
  }

  if (existing.count >= opts.limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: opts.limit - existing.count, resetAt: existing.resetAt };
}
