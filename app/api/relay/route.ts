import { GLOAM_RELAY_URL } from "@gloamtrade/sdk";
import { NextResponse } from "next/server";
import { relayRequest } from "@/lib/validation/api";
import { RateLimiter, clientKey, readJsonLimited, sameOrigin } from "@/lib/validation/rate-limit";

/**
 * Pass-through to the Gloam relay, which sends no CORS headers to browsers.
 * Requests are strictly validated to the three public relay actions and carry
 * only data that is published on chain anyway (proofs, roots, nullifiers,
 * commitments, sealed memos). Bodies are never logged or stored.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RELAY_URL = GLOAM_RELAY_URL.replace("://gloam.trade", "://www.gloam.trade");
const perClient = new RateLimiter(60, 60 * 60_000);

export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ ok: false, error: "Cross-site requests are not accepted." }, { status: 403 });
  if (!perClient.take(await clientKey(req.headers))) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Try again later.", code: "rate-limited" },
      { status: 429 },
    );
  }
  let body: unknown;
  try {
    body = await readJsonLimited(req, 12_000);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const parsed = relayRequest.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ ok: false, error: "Invalid relay request.", code: "invalid" }, { status: 400 });

  try {
    const upstream = await fetch(RELAY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(45_000),
      cache: "no-store",
    });
    const json = (await upstream.json().catch(() => null)) as {
      ok?: boolean;
      hash?: string;
      error?: string;
      code?: string;
    } | null;
    if (!json)
      return NextResponse.json(
        { ok: false, error: "The private relay returned no answer.", code: "upstream" },
        { status: 502 },
      );
    const out =
      json.ok && typeof json.hash === "string" && /^0x[0-9a-fA-F]{64}$/.test(json.hash)
        ? { ok: true, hash: json.hash }
        : {
            ok: false,
            error: typeof json.error === "string" ? json.error.slice(0, 300) : "Relay refused the request.",
            code: json.code ?? "refused",
          };
    return NextResponse.json(out, { status: upstream.ok ? 200 : upstream.status });
  } catch {
    return NextResponse.json(
      { ok: false, error: "The private relay could not be reached.", code: "unreachable" },
      { status: 502 },
    );
  }
}
