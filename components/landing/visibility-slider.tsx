"use client";

import { useState } from "react";
import { cx } from "@/components/shared/ui";

const STOPS = [
  {
    label: "Add money",
    title: "Your deposit is public. What happens next is not.",
    shown: ["Your wallet address", "Asset and amount deposited"],
  },
  {
    label: "Send",
    title: "The chain learns a transfer happened, not who or how much.",
    shown: ["That a private transfer happened"],
  },
  {
    label: "Claim link",
    title: "The claim secret lives after the #, which browsers never send to mirk.",
    shown: ["That a private transfer happened"],
  },
  {
    label: "Cash out",
    title: "Only this step puts an amount back on the record.",
    shown: ["Destination wallet", "Asset and amount"],
  },
] as const;

/** Lives on the night sky: a dark glass card with a four-stop slider. */
export function VisibilitySlider() {
  const [i, setI] = useState(1);
  const stop = STOPS[i]!;
  const pct = (i / (STOPS.length - 1)) * 100;
  return (
    <div className="h-full rounded-[26px] border border-white/15 bg-white/[0.04] p-6 text-white shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)] sm:p-8">
      <p className="text-[13px] text-white/60">Pick a step to see what it shows</p>

      <div className="relative mt-8 px-2">
        <div className="absolute inset-x-2 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/15" />
        <div
          className="bg-signal absolute top-1/2 left-2 h-[3px] -translate-y-1/2 rounded-full shadow-[0_0_14px_var(--signal-glow)] transition-[width] duration-300"
          style={{ width: `calc((100% - 1rem) * ${pct / 100})` }}
        />
        <div className="relative flex justify-between">
          {STOPS.map((s, k) => (
            <span
              key={s.label}
              aria-hidden
              className={cx(
                "size-3.5 rounded-full border-2 transition-colors",
                k <= i ? "border-signal bg-signal" : "border-white/40 bg-[#0b0b0c]",
              )}
            />
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={STOPS.length - 1}
          step={1}
          value={i}
          onChange={(e) => setI(Number(e.target.value))}
          aria-label="Step"
          aria-valuetext={stop.label}
          className="absolute inset-0 h-8 w-full -translate-y-1/4 cursor-pointer opacity-0"
        />
      </div>
      <div className="mt-4 flex justify-between gap-2 text-[12px] sm:text-[13px]">
        {STOPS.map((s, k) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setI(k)}
            className={cx(
              "rounded-full px-2.5 py-1 transition-colors",
              k === i ? "bg-signal text-on-signal font-medium" : "text-white/60 hover:text-white",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div key={i} className="fade-in mt-8 border-t border-white/10 pt-6">
        <p className="text-[20px] leading-snug font-semibold tracking-[-0.025em]">{stop.title}</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {stop.shown.map((x) => (
            <li key={x} className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[13px]">
              On chain: {x}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
