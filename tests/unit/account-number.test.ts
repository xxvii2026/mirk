import { describe, expect, it } from "vitest";
import {
  checkAccountNumber,
  formatAccountNumber,
  generateAccountNumber,
  isLuhnValid,
  luhnCheckDigit,
  normalizeAccountNumber,
  uint64ToAccountNumber,
} from "@/lib/account-number";

describe("account numbers", () => {
  it("generates 12-digit Luhn-valid numbers", () => {
    for (let i = 0; i < 500; i++) {
      const n = generateAccountNumber();
      expect(n).toMatch(/^\d{12}$/);
      expect(isLuhnValid(n)).toBe(true);
    }
  });

  it("uses all 11 body digits from the random source and preserves leading zeroes", () => {
    const zeros = (b: Uint8Array) => b.fill(0);
    const n = generateAccountNumber((b) => {
      zeros(b);
      b[10] = 1; // eleventh digit 1, the rest 0
      return b;
    });
    expect(n.startsWith("0000000000")).toBe(true);
    expect(n).toHaveLength(12);
    expect(checkAccountNumber(n).ok).toBe(true);
  });

  it("rejects biased bytes (rejection sampling)", () => {
    let calls = 0;
    const n = generateAccountNumber((b) => {
      calls++;
      b.fill(calls === 1 ? 255 : 7);
      return b;
    });
    expect(n.slice(0, 11)).toBe("77777777777");
  });

  it("computes known Luhn check digits", () => {
    expect(luhnCheckDigit("7992739871")).toBe(3);
    expect(isLuhnValid("79927398713")).toBe(true);
    expect(isLuhnValid("79927398710")).toBe(false);
  });

  it("detects every single-digit typo", () => {
    const n = generateAccountNumber();
    for (let pos = 0; pos < 12; pos++) {
      for (let d = 0; d < 10; d++) {
        if (String(d) === n[pos]) continue;
        const typo = n.slice(0, pos) + d + n.slice(pos + 1);
        expect(isLuhnValid(typo)).toBe(false);
      }
    }
  });

  it("formats and normalizes", () => {
    expect(formatAccountNumber("482916307714")).toBe("4829 1630 7714");
    expect(normalizeAccountNumber(" 4829 1630-7714 ")).toBe("482916307714");
  });

  it("validates input with specific reasons", () => {
    const valid = `48291630771${luhnCheckDigit("48291630771")}`;
    expect(checkAccountNumber(formatAccountNumber(valid))).toEqual({ ok: true, value: valid });
    expect(checkAccountNumber("")).toMatchObject({ reason: "empty" });
    expect(checkAccountNumber("4829a1630771")).toMatchObject({ reason: "format" });
    expect(checkAccountNumber("48291630")).toMatchObject({ reason: "length" });
    expect(checkAccountNumber("000000000000")).toMatchObject({ reason: "zero" });
    const bad = valid.slice(0, 11) + String((Number(valid[11]) + 1) % 10);
    expect(checkAccountNumber(bad)).toMatchObject({ reason: "checksum" });
  });

  it("round-trips through uint64 with leading zeroes", () => {
    const body = "00000001234";
    const n = body + luhnCheckDigit(body);
    expect(uint64ToAccountNumber(BigInt(n))).toBe(n);
  });
});
