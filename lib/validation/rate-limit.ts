/**
 * Best-effort, per-instance sliding-window limiter for the public testnet
 * endpoints. It keys on a hash of the client IP and stores nothing else.
 */

type Window = { hits: number[] };

export class RateLimiter {
  private buckets = new Map<string, Window>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Returns true when the request is allowed. */
  take(key: string, at = Date.now()): boolean {
    const w = this.buckets.get(key) ?? { hits: [] };
    w.hits = w.hits.filter((t) => at - t < this.windowMs);
    if (w.hits.length >= this.limit) {
      this.buckets.set(key, w);
      return false;
    }
    w.hits.push(at);
    this.buckets.set(key, w);
    if (this.buckets.size > 10_000) this.prune(at);
    return true;
  }

  private prune(at: number) {
    for (const [k, w] of this.buckets) {
      if (w.hits.every((t) => at - t >= this.windowMs)) this.buckets.delete(k);
    }
  }
}

export async function clientKey(headers: Headers): Promise<string> {
  const ip = headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`mirk|${ip}`)));
  return Array.from(d.slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Reject cross-site browser requests; allow same-origin and non-browser callers that send no Origin. */
export function sameOrigin(req: Request): boolean {
  const o = req.headers.get("origin");
  if (!o) return true;
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(o).host === host;
  } catch {
    return false;
  }
}

export async function readJsonLimited(req: Request, maxBytes: number): Promise<unknown> {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > maxBytes) throw new Error("too-large");
  const text = await req.text();
  if (text.length > maxBytes) throw new Error("too-large");
  return JSON.parse(text);
}
