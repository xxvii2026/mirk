import { describe, expect, it } from "vitest";
import { generateReceiveKey } from "@gloamtrade/sdk";
import { decodeClaimPackage, encodeClaimPackage } from "@/lib/gloam/claim-package";

async function payload() {
  const k = await generateReceiveKey();
  return { n: 46630, k: { x: k.privateJwk.x!, y: k.privateJwk.y!, d: k.privateJwk.d! }, b: "141000000" };
}

describe("claim links", () => {
  it("round-trips", async () => {
    const p = await payload();
    const enc = await encodeClaimPackage(p);
    expect(enc.startsWith("m1.")).toBe(true);
    expect(await decodeClaimPackage(`#${enc}`)).toEqual({ ok: true, payload: p });
  });

  it("detects truncation and tampering", async () => {
    const enc = await encodeClaimPackage(await payload());
    expect(await decodeClaimPackage(enc.slice(0, -3))).toMatchObject({ ok: false, reason: "integrity" });
    const [v, body, check] = enc.split(".");
    const flipped = body!.slice(0, 10) + (body![10] === "A" ? "B" : "A") + body!.slice(11);
    expect(await decodeClaimPackage(`${v}.${flipped}.${check}`)).toMatchObject({ ok: false, reason: "integrity" });
  });

  it("rejects malformed and unknown versions", async () => {
    expect(await decodeClaimPackage("")).toMatchObject({ reason: "empty" });
    expect(await decodeClaimPackage("garbage")).toMatchObject({ reason: "malformed" });
    expect(await decodeClaimPackage("m2.abc.def")).toMatchObject({ reason: "version" });
    expect(await decodeClaimPackage("m1.@@@.x")).toMatchObject({ ok: false });
  });
});
