"use client";

import type { MirkAsset } from "@/lib/shielded/sdk";
import { ASSETS } from "@/lib/robinhood/network";
import { cx } from "@/components/shared/ui";

export function AssetSelect({
  value,
  onChange,
  label = "Asset",
}: {
  value: MirkAsset;
  onChange: (a: MirkAsset) => void;
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="border-line bg-surface-2 inline-flex rounded-full border p-1">
      {ASSETS.map((a) => {
        const selected = a.address === value.address;
        return (
          <button
            key={a.address}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(a)}
            className={cx(
              "min-h-10 min-w-16 rounded-full px-4 text-sm font-medium transition-colors",
              selected ? "bg-surface text-ink shadow-[0_0_0_1px_var(--line)]" : "text-muted hover:text-ink",
            )}
          >
            {a.symbol}
          </button>
        );
      })}
    </div>
  );
}
