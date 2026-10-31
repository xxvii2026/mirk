import { describe, expect, it } from "vitest";
import {
  generateReceiveKey,
  isReceiveTag,
  encodeNotePackage,
  decodeNotePackage,
  makeBoundNotePoseidon,
} from "@/lib/shielded/sdk";
import { zeroAddress } from "viem";

describe("Mirk protocol formats", () => {
  it("uses its own receive-tag namespace", async () => {
    const key = await generateReceiveKey();
    expect(key.tag.startsWith("mirkr1.")).toBe(true);
    expect(isReceiveTag(key.tag)).toBe(true);
    expect(isReceiveTag(key.tag.replace("mirkr1.", "gloamr1."))).toBe(false);
  });
  it("rejects noncanonical notes and foreign package types", async () => {
    const note = await makeBoundNotePoseidon(100n, zeroAddress);
    const encoded = encodeNotePackage({
      pool: "0x1111111111111111111111111111111111111111",
      asset: zeroAddress,
      amountWei: "100",
      secret: note.secret,
      commitment: note.commitment,
    });
    expect(encoded.startsWith("mirkn1.")).toBe(true);
    expect(decodeNotePackage(encoded).amountWei).toBe("100");
    const foreign = { ...decodeNotePackage(encoded), type: "gloam-private-note" };
    expect(() => decodeNotePackage(JSON.stringify(foreign))).toThrow();
    expect(() =>
      decodeNotePackage(JSON.stringify({ ...foreign, type: "mirk-private-note", amountWei: (1n << 128n).toString() })),
    ).toThrow();
  });
});
