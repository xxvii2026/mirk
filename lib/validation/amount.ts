import { formatUnits, parseUnits } from "viem";

/** Amounts are handled as bigint base units end to end; no floating point. */

export type AmountParse =
  { ok: true; value: bigint } | { ok: false; reason: "empty" | "format" | "precision" | "zero" | "too-large" };

const MAX_UINT128 = (1n << 128n) - 1n;

export function parseAmount(input: string, decimals: number): AmountParse {
  const s = input.trim().replace(/,/g, "");
  if (s === "") return { ok: false, reason: "empty" };
  if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return { ok: false, reason: "format" };
  const [, frac = ""] = s.split(".");
  if (frac.length > decimals) return { ok: false, reason: "precision" };
  const value = parseUnits(s.startsWith(".") ? `0${s}` : s, decimals);
  if (value === 0n) return { ok: false, reason: "zero" };
  if (value > MAX_UINT128) return { ok: false, reason: "too-large" };
  return { ok: true, value };
}

export const AMOUNT_ERRORS: Record<Exclude<AmountParse, { ok: true }>["reason"], string> = {
  empty: "Enter an amount.",
  format: "Enter a number, like 0.5.",
  precision: "That has more decimal places than this asset supports.",
  zero: "Enter an amount above zero.",
  "too-large": "That amount is too large.",
};

/**
 * Format base units for display. Trims trailing zeroes and caps the visible
 * fraction without rounding up (so a displayed balance is never overstated).
 */
export function formatAmount(value: bigint, decimals: number, maxFraction = 6): string {
  const negative = value < 0n;
  const raw = formatUnits(negative ? -value : value, decimals);
  const [whole = "0", frac = ""] = raw.split(".");
  const cut = frac.slice(0, maxFraction).replace(/0+$/, "");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const out = cut ? `${grouped}.${cut}` : grouped;
  if (out === "0" && value !== 0n) return negative ? "-<0.000001" : "<0.000001";
  return negative ? `-${out}` : out;
}

/** Plain decimal string for an input field, no grouping. */
export function amountToInput(value: bigint, decimals: number): string {
  return formatUnits(value, decimals);
}
