"use client";

import { HiddenDots, cx } from "@/components/shared/ui";
import { formatAmount } from "@/lib/validation/amount";

/** A balance in native units. Light weight, tabular figures, never bold. */
export function Amount({
  value,
  decimals,
  symbol,
  hidden = false,
  className,
  maxFraction = 6,
}: {
  value: bigint;
  decimals: number;
  symbol: string;
  hidden?: boolean;
  className?: string;
  maxFraction?: number;
}) {
  return (
    <span className={cx("tabular font-semibold", className)}>
      {hidden ? <HiddenDots /> : formatAmount(value, decimals, maxFraction)}
      <span className="text-muted ml-[0.3em] text-[0.45em] font-normal">{symbol}</span>
    </span>
  );
}
