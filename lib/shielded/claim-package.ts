import { z } from "zod";

/**
 * Claim links carry everything needed to find and sweep one payment, after the
 * URL `#`, so it is never sent to any server:
 *
 *   https://<host>/claim#m1.<base64url JSON>.<integrity>
 *
 * The JSON holds the ephemeral receive key the payment was sealed to, plus a
 * block hint to keep the scan short. Integrity is a truncated SHA-256 over the
 * version and payload, which catches truncated or mistyped links.
 */

export const CLAIM_VERSION = "m2";

const payload = z.object({
  /** chain id */
  n: z.number().int(),
  /** Pool address: a claim never crosses pool deployments. */
  p: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  /** P-256 private JWK fields */
  k: z.object({ x: z.string().min(40), y: z.string().min(40), d: z.string().min(40) }),
  /** block hint (decimal string): the payment was posted at or after this block */
  b: z.string().regex(/^\d+$/),
});
export type ClaimPayload = z.infer<typeof payload>;

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error("bad base64url");
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function integrity(body: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${CLAIM_VERSION}|${body}`)));
  return b64url(d.slice(0, 9));
}

export async function encodeClaimPackage(p: ClaimPayload): Promise<string> {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload.parse(p))));
  return `${CLAIM_VERSION}.${body}.${await integrity(body)}`;
}

export type ClaimParse =
  { ok: true; payload: ClaimPayload } | { ok: false; reason: "empty" | "version" | "malformed" | "integrity" };

export async function decodeClaimPackage(fragment: string): Promise<ClaimParse> {
  const raw = fragment.replace(/^#/, "").trim();
  if (!raw) return { ok: false, reason: "empty" };
  const parts = raw.split(".");
  if (parts[0] !== CLAIM_VERSION) return { ok: false, reason: parts.length === 3 ? "version" : "malformed" };
  if (parts.length !== 3 || !parts[1] || !parts[2]) return { ok: false, reason: "malformed" };
  const [, body, check] = parts;
  if ((await integrity(body)) !== check) return { ok: false, reason: "integrity" };
  try {
    const json = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    const parsed = payload.safeParse(json);
    return parsed.success ? { ok: true, payload: parsed.data } : { ok: false, reason: "malformed" };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}

export const CLAIM_ERRORS: Record<Exclude<ClaimParse, { ok: true }>["reason"], string> = {
  empty: "This claim link is missing its code. Ask the sender for the complete link.",
  version: "This claim link was made by a newer version of Mirk.",
  malformed: "This claim link is incomplete or damaged. Ask the sender for the complete link.",
  integrity: "This claim link failed its integrity check. It may have been cut off when copied.",
};

export function claimKeyJwk(p: ClaimPayload) {
  return { kty: "EC", crv: "P-256", x: p.k.x, y: p.k.y, d: p.k.d, ext: true };
}
