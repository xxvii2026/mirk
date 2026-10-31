import { submitRelay, RelaySubmissionUnknownError } from "@/lib/shielded/relay-server";
import { NextResponse } from "next/server";
import { relayRequest } from "@/lib/validation/api";
import { RateLimiter, clientKey, readJsonLimited, sameOrigin } from "@/lib/validation/rate-limit";

/** Mirk's own gas sponsor. Accepts only validated public proof data and sealed memos. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const globalBudget = new RateLimiter(100, 60 * 60_000);
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

  if (!globalBudget.take("relay"))
    return NextResponse.json(
      { ok: false, error: "Relay busy. Try again later.", code: "rate-limited" },
      { status: 429 },
    );
  try {
    const hash = await submitRelay(parsed.data);
    return NextResponse.json({ ok: true, hash });
  } catch (error) {
    const uncertain = error instanceof RelaySubmissionUnknownError;
    // A transport failure can happen after broadcast. Preserve pending notes;
    // clients reconcile from chain state before attempting another spend.
    return NextResponse.json(
      {
        ok: false,
        error: "Mirk's relay could not confirm submission. Check payment status before retrying.",
        code: uncertain ? "maybe_sent" : "not_submitted",
      },
      { status: 503 },
    );
  }
}
