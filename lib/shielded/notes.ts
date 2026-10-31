import type { NoteRecord } from "../crypto-store/records";
import type { StoredRecord } from "../crypto-store/vault";

/** Pure note bookkeeping: balances and coin selection. */

export const MAX_PARTS = 8;

export function sameAsset(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

export function spendable(notes: StoredRecord<NoteRecord>[], asset: string): StoredRecord<NoteRecord>[] {
  return notes.filter(
    (n) => n.value.status === "unspent" && sameAsset(n.value.asset, asset) && BigInt(n.value.amountWei) > 0n,
  );
}

/** The private balance: the sum of confirmed, unspent notes for an asset. */
export function privateBalance(notes: StoredRecord<NoteRecord>[], asset: string): bigint {
  return spendable(notes, asset).reduce((s, n) => s + BigInt(n.value.amountWei), 0n);
}

/** Notes that are on their way in (submitted, not confirmed yet). */
export function incomingBalance(notes: StoredRecord<NoteRecord>[], asset: string): bigint {
  return notes
    .filter((n) => n.value.status === "pending" && sameAsset(n.value.asset, asset))
    .reduce((s, n) => s + BigInt(n.value.amountWei), 0n);
}

export interface SpendPart {
  noteId: string;
  /** The note's full amount. */
  amountIn: bigint;
  /** How much of it this part moves. */
  amount: bigint;
}

export type Selection =
  | { ok: true; parts: SpendPart[]; total: bigint }
  | { ok: false; reason: "insufficient" | "too-many-parts"; available: bigint };

/**
 * Pick notes to cover `target`. Each Mirk spend consumes exactly one note, so
 * a payment larger than any single note becomes several explicit parts.
 *  - Prefer the smallest single note that covers the target (one transaction).
 *  - Otherwise take notes largest-first; every part spends a whole note except
 *    the last, which spends only what is still needed.
 */
export function selectNotes(notes: { id: string; amount: bigint }[], target: bigint, maxParts = MAX_PARTS): Selection {
  if (target <= 0n) throw new Error("Amount must be positive");
  const usable = notes.filter((n) => n.amount > 0n);
  const available = usable.reduce((s, n) => s + n.amount, 0n);
  if (available < target) return { ok: false, reason: "insufficient", available };

  const covering = usable
    .filter((n) => n.amount >= target)
    .sort((a, b) => (a.amount < b.amount ? -1 : a.amount > b.amount ? 1 : 0));
  if (covering[0]) {
    return {
      ok: true,
      total: target,
      parts: [{ noteId: covering[0].id, amountIn: covering[0].amount, amount: target }],
    };
  }

  const desc = [...usable].sort((a, b) => (a.amount > b.amount ? -1 : a.amount < b.amount ? 1 : 0));
  const parts: SpendPart[] = [];
  let remaining = target;
  for (const n of desc) {
    if (remaining === 0n) break;
    const take = n.amount < remaining ? n.amount : remaining;
    parts.push({ noteId: n.id, amountIn: n.amount, amount: take });
    remaining -= take;
  }
  if (parts.length > maxParts) return { ok: false, reason: "too-many-parts", available };
  return { ok: true, parts, total: target };
}
