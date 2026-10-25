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
    <div className="raised relative w-full max-w-[430px] rounded-[22px] p-5 shadow-[var(--highlight),var(--shadow-float)] sm:p-6">
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
            <span className="btn btn-light size-10 p-0">
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

/** Lives on the dark night band, in both themes. */
export function PaymentSteps() {
  const [active, setActive] = useState(0);
  const step = STEPS[active]!;
  return (
    <div className="grid gap-4 rounded-[28px] border border-white/10 bg-white/[0.03] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-4 lg:grid-cols-[1.05fr_1fr] lg:gap-6">
      <ol className="space-y-1.5 py-1 sm:py-2">
        {STEPS.map((s, i) => {
          const on = i === active;
          return (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={on}
                className={cx(
                  "flex w-full items-start gap-4 rounded-[20px] p-4 text-left transition-[background-color,box-shadow,transform] duration-200 sm:p-5",
                  on
                    ? "bg-white text-[#0b0b0c] shadow-[0_18px_40px_-14px_rgba(0,0,0,0.7)]"
                    : "text-white hover:bg-white/[0.06]",
                )}
              >
                <span
                  className={cx(
                    "grid size-11 shrink-0 place-items-center rounded-[12px] font-mono text-[12px] transition-colors",
                    on
                      ? "bg-[#0b0b0c] text-white"
                      : "border border-white/12 bg-white/[0.06] text-white/70",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block text-[19px] font-semibold tracking-[-0.02em]">{s.title}</span>
                  <span className={cx("mt-1 block text-[14px] leading-relaxed", on ? "text-[#565d6a]" : "text-white/65")}>
                    {s.text}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="stage-deep relative isolate flex min-h-[400px] flex-col justify-between gap-6 overflow-hidden rounded-[22px] p-5 sm:p-7">
        <div key={active} className="fade-in bg-surface text-ink shadow-float rounded-[18px] p-5">
          <p className="text-[15px] font-semibold">{step.title}</p>
          <p className="text-ink-2 mt-0.5 text-[13px]">Above the surface: what this step puts on the record</p>
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
        <div
          key={`k${active}`}
          className="fade-in rounded-[18px] border border-white/20 bg-black/55 p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md"
        >
          <p className="text-[13px] text-white/75">Below the surface: stays on your device or off the record</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {step.kept.map((x) => (
              <li key={x} className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[14px] font-medium">
                {x}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
