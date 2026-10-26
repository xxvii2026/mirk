import Link from "next/link";
import type { ReactNode } from "react";
import { IconArrowRight, IconArrowUpRight } from "@/components/shared/icons";
import { CHAIN_ID, EXPLORER_URL, POOL_ADDRESS } from "@/lib/robinhood/network";
import { Logo } from "./wordmark";

export const WRAP = "mx-auto w-full max-w-[1176px] px-4 sm:px-6 lg:px-9";

const NAV = [
  ["How it works", "/#how"],
  ["Privacy", "/#privacy"],
  ["Claim links", "/#claim"],
  ["Docs", "/docs"],
] as const;

/** A floating liquid-glass pill: the mark, the sections, the theme switch and one action. */
export function SiteHeader() {
  return (
    <>
      <header className="fixed inset-x-0 top-3 z-40 px-4 sm:top-4">
        <div className="glass mx-auto flex h-14 max-w-[820px] items-center justify-between gap-3 rounded-full pr-2 pl-4">
          <Link href="/" aria-label="mirk home" className="flex min-h-11 items-center">
            <Logo className="size-8" />
          </Link>
          <nav aria-label="Site" className="hidden items-center gap-0.5 md:flex">
            {NAV.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="text-ink-2 hover:text-ink rounded-full px-3.5 py-2 text-[14px] transition-colors hover:bg-white/[0.06]"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <Link href="/app" className="btn btn-accent min-h-10 px-5 text-[14px]">
              Open mirk
            </Link>
          </div>
        </div>
      </header>
      <div aria-hidden className="h-[76px] sm:h-20" />
    </>
  );
}

const FOOTER: [string, [string, string][]][] = [
  [
    "Product",
    [
      ["Open mirk", "/app"],
      ["Send privately", "/app/send"],
      ["Receive", "/app/receive"],
      ["Claim a link", "/claim"],
    ],
  ],
  [
    "Proof",
    [
      ["How it works", "/docs"],
      ["Contracts", "/contracts"],
    ],
  ],
  [
    "Legal",
    [
      ["Privacy", "/privacy"],
      ["Risk", "/risk"],
    ],
  ],
];

/**
 * The footer ends on the name itself, set huge and sunk below a waterline, the
 * way the mark settles into its ripples. Each letter surfaces when touched.
 */
export function SiteFooter() {
  return (
    <footer className="border-line bg-canvas relative isolate overflow-hidden border-t">
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-[70%] bg-[radial-gradient(60%_70%_at_50%_100%,rgba(185,166,255,0.1)_0%,rgba(185,166,255,0)_70%)]"
      />
      <div className={`${WRAP} pt-16`}>
        <div className="grid grid-cols-3 gap-x-4 gap-y-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-3 space-y-5 md:col-span-1">
            <Logo className="size-10" />
            <p className="text-ink max-w-[18rem] text-[20px] leading-snug font-medium tracking-[-0.02em]">
              Your balance stays off the public record.
            </p>
            <Link href="/app" className="btn btn-accent min-h-11 px-5 text-[14px]">
              Open mirk <IconArrowRight className="size-4" />
            </Link>
          </div>
          {FOOTER.map(([heading, links]) => (
            <nav key={heading} aria-label={heading} className="space-y-1">
              <p className="text-muted mb-3 font-mono text-[11px] tracking-[0.12em] uppercase">{heading}</p>
              {links.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="text-ink-2 hover:text-ink group flex min-h-9 items-center gap-2 text-[15px] transition-colors"
                >
                  <span
                    aria-hidden
                    className="bg-signal size-1.5 scale-0 rounded-full transition-transform duration-200 group-hover:scale-100"
                  />
                  <span className="-ml-3.5 transition-[margin] duration-200 group-hover:ml-0">{label}</span>
                </Link>
              ))}
            </nav>
          ))}
        </div>

        <div className="border-line text-ink-2 mt-16 flex flex-col gap-3 border-t pt-6 font-mono text-[11px] tracking-[0.06em] sm:flex-row sm:items-center sm:justify-between">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-2">
              <span aria-hidden className="bg-signal size-1.5 rounded-full shadow-[0_0_0_3px_var(--signal-tint)]" />
              TESTNET
            </span>
            <span>CHAIN {CHAIN_ID}</span>
            <a
              href={`${EXPLORER_URL}/address/${POOL_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink inline-flex items-center gap-1 transition-colors"
            >
              POOL {POOL_ADDRESS.slice(0, 6)}…{POOL_ADDRESS.slice(-4)} <IconArrowUpRight className="size-3" />
            </a>
          </p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a
              href="https://gloam.trade"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink inline-flex items-center gap-1 transition-colors"
            >
              BUILT ON GLOAM <IconArrowUpRight className="size-3" />
            </a>
            <a href="#" className="hover:text-ink inline-flex items-center gap-1 transition-colors">
              BACK TO TOP <IconArrowRight className="size-3 -rotate-90" />
            </a>
          </p>
        </div>
        <p className="text-muted mt-3 text-[12px]">
          Robinhood Chain testnet only. Test assets have no value. mirk has not been externally audited.
        </p>
      </div>

      <div aria-hidden className="relative mt-6 h-[0.62em] text-[clamp(9rem,40vw,31rem)] leading-[0.8] select-none">
        <p className="absolute inset-x-0 top-0 flex justify-center font-medium tracking-[-0.04em]">
          {"mirk".split("").map((ch, i) => (
            <span
              key={i}
              className="text-surface-3 hover:text-signal inline-block transition-[color,transform] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-[0.08em]"
            >
              {ch}
            </span>
          ))}
        </p>
        {/* The waterline: ripples over the lower half of the letters. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-[linear-gradient(180deg,transparent,var(--canvas)_85%)]" />
        <div className="text-signal/25 pointer-events-none absolute inset-x-0 bottom-0 h-[42%] [background-image:repeating-linear-gradient(180deg,currentColor_0_1px,transparent_1px_10px)] [mask-image:linear-gradient(180deg,#000,transparent)]" />
      </div>
    </footer>
  );
}

export function InfoPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-canvas min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-[42.5rem] px-4 pt-16 pb-24 sm:px-6">
        <h1 className="display-l mb-10">{title}</h1>
        <div className="text-ink-2 [&_a]:text-signal-text [&_h2]:text-ink [&_strong]:text-ink space-y-5 text-[16px] leading-relaxed [&_a]:underline [&_a]:underline-offset-4 [&_h2]:pt-6 [&_h2]:text-[21px] [&_h2]:font-semibold [&_strong]:font-medium">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
