"use client";

import { useState } from "react";
import { Mark } from "@/components/brand/wordmark";
import { IconClock, IconHome, IconLayers, IconReceive, IconSend } from "@/components/shared/icons";
import { HiddenDots, cx } from "@/components/shared/ui";

type View = "you" | "chain";

const NAV = [
  [IconHome, "Home"],
  [IconSend, "Send"],
  [IconReceive, "Receive"],
  [IconClock, "Activity"],
] as const;

/** Landing illustration of the app. Every value is a labelled example, not account data. */
export function AppWindow() {
  const [view, setView] = useState<View>("you");
  const you = view === "you";
  const rows: [string, string, string, boolean][] = you
    ? [
        ["Sent to 6120 4471 0938", "Private transfer", "−250.00", false],
        ["Received by claim link", "Private transfer", "+40.00", false],
        ["Added from your wallet", "Public deposit", "+1,210.00", true],
      ]
    : [
        ["A private transfer happened", "Amount and recipient not on chain", "", false],
        ["A private transfer happened", "Amount and sender not on chain", "", false],
        ["Deposit from 0x6dC3…7E02", "Public deposit", "+1,210.00", true],
      ];

  return (
    <div className="bg-surface border-line grid overflow-hidden rounded-[26px] border text-left shadow-[var(--highlight),var(--shadow-float)] md:grid-cols-[220px_1fr]">
      <aside className="border-line bg-surface-2 hidden flex-col gap-1 border-r p-4 md:flex">
        <div className="mb-4 flex items-center gap-2 px-2">
          <Mark className="text-ink size-7" />
          <span className="border-line-strong text-ink-2 rounded-full border px-2 py-0.5 text-[11px] font-medium">
            Testnet
          </span>
        </div>
        {NAV.map(([Icon, label], i) => (
          <span
            key={label}
            className={cx(
              "flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-[14px]",
              i === 0 ? "text-ink bg-surface font-medium shadow-[var(--shadow-card)]" : "text-ink-2",
            )}
          >
            <Icon className="size-4" /> {label}
          </span>
        ))}
        <span className="text-ink-2 bg-surface mt-auto flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px]">
          <IconLayers className="size-4" /> Robinhood Chain
        </span>
      </aside>

      <div className="p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-ink-2 text-[13px]">Your private balance · example values</p>
            <p className="tabular mt-2 flex h-12 items-baseline gap-2 text-[40px] leading-none font-semibold tracking-[-0.04em] sm:text-[46px]">
              {you ? "1,000.00" : <HiddenDots className="text-ink/80" />}
              <span className="text-ink-2 text-[15px] font-medium tracking-normal">USDG</span>
            </p>
          </div>
          <div role="tablist" aria-label="Point of view" className="bg-surface-2 inline-flex rounded-full p-1">
            {(
              [
                ["you", "What you see"],
                ["chain", "What the chain sees"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={view === k}
                onClick={() => setView(k)}
                className={cx(
                  "min-h-9 rounded-full px-3.5 text-[13px] font-medium transition-colors",
                  view === k ? "bg-ink text-on-ink" : "text-ink-2 hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <ul className="border-line mt-7 divide-y divide-[var(--line)] border-t">
          {rows.map(([title, sub, amount, isPublic], i) => (
            <li key={i} className="flex items-center justify-between gap-4 py-3.5">
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-medium">{title}</span>
                <span className="text-ink-2 block text-[13px]">{sub}</span>
              </span>
              <span className="tabular shrink-0 text-[15px] font-semibold">
                {amount ? (
                  <>
                    {amount}
                    {isPublic ? (
                      <span className="text-ink-2 ml-2 rounded-full border border-[var(--line-strong)] px-2 py-0.5 text-[11px] font-medium">
                        Public
                      </span>
                    ) : null}
                  </>
                ) : (
                  <HiddenDots className="text-ink/60" />
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
