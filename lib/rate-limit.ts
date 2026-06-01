/**
 * Best-effort in-memory rate limiter for the public submit endpoint
 * (ENGINEERING_PLAN decision 12). A sliding-window counter keyed by
 * IP + form slug.
 *
 * Honest caveat: on serverless (Vercel) this is per-instance and resets on cold
 * start, so it is NOT a hard guarantee — it's a cheap first line of defense
 * against a single client hammering the endpoint. The DURABLE abuse guard is
 * the per-form response CAP enforced against the database (see the route
 * handler). For a side project this pairing is the right amount of rigor; a
 * shared store (Upstash/Redis) is the upgrade path if abuse ever shows up.
 */

interface Window {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000; // 1 minute
const MAX_PER_WINDOW = 10; // submissions per IP per form per minute

const buckets = new Map<string, Window>();

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets (for a Retry-After header). */
  retryAfter: number;
}

export function checkRateLimit(
  key: string,
  now: number = Date.now(),
): RateLimitResult {
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }

  if (existing.count >= MAX_PER_WINDOW) {
    return {
      ok: false,
      retryAfter: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return { ok: true, retryAfter: 0 };
}

/** Opportunistically drop expired windows so the map can't grow unbounded. */
export function sweepRateLimit(now: number = Date.now()): void {
  for (const [key, win] of buckets) {
    if (now >= win.resetAt) buckets.delete(key);
  }
}

/** Test-only: clear all state. */
export function __resetRateLimit(): void {
  buckets.clear();
}

/** The per-form response cap (durable guard). */
export const PER_FORM_RESPONSE_CAP = 1000;
