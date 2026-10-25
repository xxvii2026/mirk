import { NextResponse } from "next/server";
import { registerOnChain } from "@/lib/registry/server";
import { registerRequest } from "@/lib/validation/api";
import { RateLimiter, clientKey, readJsonLimited, sameOrigin } from "@/lib/validation/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public testnet endpoint: a few registrations per client per hour, and a global ceiling.
const perClient = new RateLimiter(5, 60 * 60_000);
const global = new RateLimiter(300, 60 * 60_000);

const MESSAGES: Record<string, { status: number; error: string }> = {
  "number-taken": { status: 409, error: "This account number is already registered." },
  "tag-taken": { status: 409, error: "This receive key already has an account number." },
  "registrar-unfunded": {
    status: 503,
    error: "Registration is paused: the testnet registrar needs gas. Try again later.",
  },
  "not-configured": { status: 503, error: "Registration is not configured on this deployment yet." },
  failed: { status: 502, error: "The registration transaction could not be submitted. Try again." },
};

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-site requests are not accepted." }, { status: 403 });
  const key = await clientKey(req.headers);
  if (!perClient.take(key) || !global.take("all")) {
    return NextResponse.json(
      { error: "Too many registrations. Try again later.", code: "rate-limited" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await readJsonLimited(req, 2_048);
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = registerRequest.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid account number or receive tag." }, { status: 400 });

  const outcome = await registerOnChain(parsed.data.accountNumber, parsed.data.receiveTag);
  if (outcome.ok) return NextResponse.json({ hash: outcome.hash });
  const m = MESSAGES[outcome.code]!;
  return NextResponse.json({ error: m.error, code: outcome.code }, { status: m.status });
}
