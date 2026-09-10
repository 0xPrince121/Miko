const WINDOW_MS = 60 * 1000;
const MAX = 120;

const buckets = new Map<string, { start: number; count: number }>();

export function rateLimit(ip: string, max = MAX): boolean {
  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket || now - bucket.start > WINDOW_MS) {
    bucket = { start: now, count: 0 };
    buckets.set(ip, bucket);
  }
  bucket.count += 1;
  if (bucket.count > max) {
    if (buckets.size > 5000) buckets.clear();
    return false;
  }
  return true;
}