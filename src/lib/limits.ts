import { createHash } from "node:crypto";

// Turn the random browser token into something safe to store. The raw token is
// never written to the database, so a database leak cannot be used to
// impersonate commenters.
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Read the device token a browser sends with every write. Anything shorter than
// a UUID is treated as missing.
export function readToken(req: Request): string {
  const t = (req.headers.get("x-phw-token") || "").trim();
  return t.length >= 16 ? t : "";
}

// Best-effort in-memory rate limit. On a single server this is exact; on
// serverless it is per-instance, which still stops the easy floods.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  // Keep the map from growing forever on a long-lived server.
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return true;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "local";
}
