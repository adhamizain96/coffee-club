/**
 * Simple in-memory rate limiter.
 * For production at scale, replace with Redis-backed implementation.
 *
 * Buckets isolate different endpoints — e.g. notes (5/min) and submissions
 * (3/hour) can share the same store without interfering.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  bucket?: string;
}

const store = new Map<string, RateLimitEntry>();

const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX = 5;
const DEFAULT_BUCKET = "default";

export function rateLimit(
  ip: string,
  opts?: RateLimitOptions
): { allowed: boolean; retryAfterMs: number } {
  const windowMs = opts?.windowMs ?? DEFAULT_WINDOW_MS;
  const max = opts?.max ?? DEFAULT_MAX;
  const bucket = opts?.bucket ?? DEFAULT_BUCKET;

  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= max) {
    return { allowed: false, retryAfterMs: entry.resetTime - now };
  }

  entry.count++;
  return { allowed: true, retryAfterMs: 0 };
}

// Clean up stale entries periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);
