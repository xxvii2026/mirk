import { describe, expect, it } from "vitest";
import { formatAmount, parseAmount } from "@/lib/validation/amount";

describe("amounts", () => {
  it("parses decimals into exact base units", () => {
    expect(parseAmount("0.1", 18)).toEqual({ ok: true, value: 100000000000000000n });
    expect(parseAmount("1,000.5", 6)).toEqual({ ok: true, value: 1000500000n });
    expect(parseAmount(".25", 6)).toEqual({ ok: true, value: 250000n });
    // 0.1 + 0.2 style float error must not exist.
    expect(parseAmount("0.3", 18)).toEqual({ ok: true, value: 300000000000000000n });
  });

  it("rejects bad input", () => {
    expect(parseAmount("", 6)).toMatchObject({ ok: false, reason: "empty" });
    expect(parseAmount("abc", 6)).toMatchObject({ ok: false, reason: "format" });
    expect(parseAmount("-1", 6)).toMatchObject({ ok: false, reason: "format" });
    expect(parseAmount("1e5", 6)).toMatchObject({ ok: false, reason: "format" });
    expect(parseAmount("0.0000001", 6)).toMatchObject({ ok: false, reason: "precision" });
    expect(parseAmount("0", 6)).toMatchObject({ ok: false, reason: "zero" });
    expect(parseAmount("1".repeat(50), 6)).toMatchObject({ ok: false, reason: "too-large" });
  });

  it("formats without overstating", () => {
    expect(formatAmount(1999999n, 6, 2)).toBe("1.99");
    expect(formatAmount(1234567890000000000000n, 18)).toBe("1,234.56789");
    expect(formatAmount(0n, 18)).toBe("0");
    expect(formatAmount(1n, 18)).toBe("<0.000001");
  });
});
