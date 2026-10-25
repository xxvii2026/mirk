import Link from "next/link";
import type { ReactNode } from "react";
import { IconArrowUpRight, IconLayers } from "@/components/shared/icons";
import { ThemeToggle } from "./theme-toggle";
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
          <Link href="/" aria-label="MIRK home" className="flex min-h-11 items-center">
            <Logo className="size-8" />
          </Link>
          <nav aria-label="Site" className="hidden items-center gap-0.5 md:flex">
            {NAV.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="text-ink-2 hover:text-ink rounded-full px-3.5 py-2 text-[14px] transition-colors hover:bg-black/[0.04]"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Link href="/app" className="btn btn-accent min-h-10 px-5 text-[14px]">
              Open MIRK
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
      ["Open MIRK", "/app"],
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

export function SiteFooter() {
  return (
    <footer className="border-line bg-canvas border-t">
      <div className={`${WRAP} pt-16 pb-8`}>
        <div className="grid gap-12 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <Logo className="size-10" />
            <p className="text-ink-2 max-w-[17rem] text-[14px] leading-relaxed">
              Private money for the open economy. Your balance stays off the public record.
            </p>
            <p className="text-ink-2 flex items-center gap-2 text-[14px]">
              <IconLayers className="size-4" /> Built on Robinhood Chain and Gloam
            </p>
          </div>
          {FOOTER.map(([heading, links]) => (
            <nav key={heading} aria-label={heading} className="space-y-1">
              <p className="mb-3 text-[14px] font-semibold">{heading}</p>
              {links.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="text-ink-2 hover:text-ink flex min-h-9 items-center text-[14px] transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
        <div className="border-line text-ink-2 mt-14 flex flex-col gap-2 border-t pt-6 text-[13px] sm:flex-row sm:justify-between">
          <p>Robinhood Chain testnet only. Test assets have no value. MIRK has not been externally audited.</p>
          <a
            href="https://gloam.trade"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink inline-flex items-center gap-1"
          >
            Gloam shielded pool <IconArrowUpRight className="size-3.5" />
          </a>
        </div>
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
