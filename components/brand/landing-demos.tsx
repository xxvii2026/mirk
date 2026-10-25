"use client";

import { useState } from "react";
import { IconClock, IconHome, IconReceive, IconSend } from "@/components/shared/icons";
import { HiddenDots, cx } from "@/components/shared/ui";

type View = "you" | "chain";

/** Landing illustration only. Every value is a labelled example, not account data. */
export function AppPreview() {
  const [view, setView] = useState<View>("you");
  const you = view === "you";
  return (
    <div className="bg-surface shadow-float w-full max-w-[430px] rounded-[22px] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold">Your private balance</p>
          <p className="text-ink-2 mt-0.5 text-[13px]">Example values</p>
        </div>
        <div role="tablist" aria-label="Point of view" className="bg-surface-2 inline-flex shrink-0 rounded-full p-1">
          {(
            [
              ["you", "You"],
              ["chain", "The chain"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={view === k}
              onClick={() => setView(k)}
              className={cx(
                "min-h-8 rounded-full px-3 text-[12px] font-medium transition-[background-color,color,box-shadow] duration-200",
                view === k ? "bg-surface text-ink shadow-card" : "text-ink-2 hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="tabular mt-6 flex h-12 items-baseline gap-2 text-[40px] leading-none font-semibold tracking-[-0.03em]">
        {you ? "1,000.00" : <HiddenDots className="text-ink/80" />}
        <span className="text-ink-2 text-[15px] font-medium tracking-normal">USDG</span>
      </p>

      <div className="bg-surface-2 mt-5 space-y-3 rounded-2xl p-4">
        <Row label="Account" value={you ? "4829 1630 7714" : "Not linked to a wallet"} mono={you} />
        <div className="border-line border-t" />
        <Row label="Sent" value={you ? "250.00 USDG to 6120 4471 0938" : "A private transfer happened"} />
        <div className="border-line border-t" />
        <Row label="Received" value={you ? "40.00 USDG by claim link" : "Not visible"} />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {(
          [
            [IconHome, "Home"],
            [IconSend, "Send"],
            [IconReceive, "Receive"],
            [IconClock, "Activity"],
          ] as const
        ).map(([Icon, label]) => (
          <div key={label} className="flex flex-col items-center gap-1.5 py-1">
            <span className="border-line grid size-10 place-items-center rounded-full border">
              <Icon className="size-[18px]" />
            </span>
            <span className="text-ink-2 text-[11px] font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-[13px]">
      <span className="text-ink-2 shrink-0">{label}</span>
      <span className={cx("truncate text-right font-medium", mono && "tabular font-mono text-[12px]")}>{value}</span>
    </div>
  );
}

const STEPS = [
  {
    title: "Add money",
    text: "Deposit test ETH or USDG from any EVM wallet into Gloam's shielded pool. It becomes a private note only your device can spend.",
    shown: ["Your wallet address", "Asset and amount deposited"],
    kept: ["The note secret that can spend it"],
  },
  {
    title: "Get an account number",
    text: "MIRK registers a 12-digit number against a public receive tag. Share it to get paid, the way you would a bank account.",
    shown: ["The number and its receive tag"],
    kept: ["Your name", "Your wallet", "Your balance"],
  },
  {
    title: "Send privately",
    text: "Your browser builds a zero-knowledge proof. By default the Gloam relay submits it, so your wallet does not appear.",
    shown: ["That a private transfer happened"],
    kept: ["Who you paid", "How much", "What you have left"],
  },
  {
    title: "Cash out",
    text: "Send money back to any public wallet whenever you want. Only this step puts an amount on the record.",
    shown: ["Destination wallet", "Asset and amount"],
    kept: ["The rest of your balance"],
  },
] as const;

export function PaymentSteps() {
  const [active, setActive] = useState(0);
  const step = STEPS[active]!;
  return (
    <div className="bg-surface-2 grid gap-6 rounded-[28px] p-3 sm:p-4 lg:grid-cols-[1.05fr_1fr] lg:gap-8">
      <ol className="space-y-1.5 py-2 sm:py-4 lg:pl-3">
        {STEPS.map((s, i) => {
          const on = i === active;
          return (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={on}
                className={cx(
                  "flex w-full items-start gap-4 rounded-[20px] p-4 text-left transition-colors duration-200 sm:p-5",
                  on ? "bg-ink text-on-ink" : "hover:bg-surface",
                )}
              >
                <span
                  className={cx(
                    "grid size-11 shrink-0 place-items-center rounded-[12px] font-mono text-[12px]",
                    on ? "bg-surface text-ink" : "bg-surface text-ink-2",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block text-[19px] font-semibold tracking-[-0.02em]">{s.title}</span>
                  <span className={cx("mt-1 block text-[14px] leading-relaxed", on ? "text-on-ink/75" : "text-ink-2")}>
                    {s.text}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="stage-deep relative flex min-h-[420px] flex-col justify-between gap-6 overflow-hidden rounded-[22px] p-5 sm:p-7">
        <div key={active} className="fade-in bg-surface shadow-float rounded-[18px] p-5">
          <p className="text-[15px] font-semibold">{step.title}</p>
          <p className="text-ink-2 mt-0.5 text-[13px]">What this step puts on the record</p>
          <ul className="mt-4 space-y-2">
            {step.shown.map((x) => (
              <li key={x} className="flex items-center justify-between gap-3 text-[14px]">
                <span>{x}</span>
                <span className="text-ink-2 bg-surface-2 rounded-full px-2.5 py-0.5 text-[12px] font-medium">
                  Public
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div key={`k${active}`} className="fade-in rounded-[18px] border border-white/25 bg-[#0c3b2d]/75 p-5 text-white backdrop-blur-md">
          <p className="text-[13px] text-white/75">Stays on your device or off the record</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {step.kept.map((x) => (
              <li key={x} className="rounded-full bg-white/12 px-3 py-1.5 text-[14px] font-medium">
                {x}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
