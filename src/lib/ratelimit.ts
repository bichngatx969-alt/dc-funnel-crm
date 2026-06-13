// Rate limit đơn giản trong bộ nhớ (đủ cho MVP 1 instance).
// Khi scale nhiều instance nên thay bằng Redis/Upstash.
const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): { ok: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    return { ok: false, remaining: 0, retryAfterMs: windowMs - (now - arr[0]) };
  }
  arr.push(now);
  buckets.set(key, arr);
  return { ok: true, remaining: max - arr.length, retryAfterMs: 0 };
}
