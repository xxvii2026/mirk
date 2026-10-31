import { describe, expect, it } from "vitest";
import { selectNotes } from "@/lib/shielded/notes";

const n = (id: string, amount: bigint) => ({ id, amount });

describe("note selection", () => {
  it("uses the smallest single note that covers the amount", () => {
    const sel = selectNotes([n("a", 100n), n("b", 30n), n("c", 50n)], 40n);
    expect(sel).toEqual({ ok: true, total: 40n, parts: [{ noteId: "c", amountIn: 50n, amount: 40n }] });
  });

  it("splits across notes largest-first when no single note covers it", () => {
    const sel = selectNotes([n("a", 10n), n("b", 30n), n("c", 20n)], 45n);
    expect(sel.ok && sel.parts).toEqual([
      { noteId: "b", amountIn: 30n, amount: 30n },
      { noteId: "c", amountIn: 20n, amount: 15n },
    ]);
  });

  it("reports insufficient balance", () => {
    expect(selectNotes([n("a", 10n)], 11n)).toEqual({ ok: false, reason: "insufficient", available: 10n });
  });

  it("ignores zero-value notes and caps the number of parts", () => {
    const many = Array.from({ length: 10 }, (_, i) => n(String(i), 1n));
    expect(selectNotes([...many, n("z", 0n)], 10n, 8)).toMatchObject({ ok: false, reason: "too-many-parts" });
    expect(selectNotes(many, 8n, 8)).toMatchObject({ ok: true });
  });

  it("parts always sum to the target", () => {
    for (let t = 1n; t <= 60n; t++) {
      const sel = selectNotes([n("a", 7n), n("b", 13n), n("c", 40n)], t);
      if (!sel.ok) throw new Error("should cover");
      expect(sel.parts.reduce((s, p) => s + p.amount, 0n)).toBe(t);
      for (const p of sel.parts) expect(p.amount <= p.amountIn).toBe(true);
    }
  });
});
