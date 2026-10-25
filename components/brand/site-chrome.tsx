import Link from "next/link";
import type { ReactNode } from "react";
import { IconArrowUpRight, IconChevronDown, IconLayers } from "@/components/shared/icons";
import { CHAIN_ID, POOL_ADDRESS, REGISTRY_ADDRESS, addressUrl } from "@/lib/robinhood/network";
import { ThemeToggle } from "./theme-toggle";
import { Logo } from "./wordmark";

export const WRAP = "mx-auto w-full max-w-[1176px] px-4 sm:px-6 lg:px-9";

const NAV = [
  ["How it works", "/docs"],
  ["Contracts", "/contracts"],
  ["Privacy", "/privacy"],
  ["Risk", "/risk"],
] as const;

function short(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Live facts under the nav: the real contracts MIRK runs on. */
function FactStrip() {
  const facts: [string, string | null][] = [
    ["Gloam pool", POOL_ADDRESS],
    ["Account registry", REGISTRY_ADDRESS],
  ];
  return (
    <div className="border-line border-b">
      <div className={`${WRAP} flex min-h-10 items-center justify-between gap-6 overflow-x-auto text-[13px]`}>
        <div className="flex shrink-0 items-center gap-5">
          {facts.map(([label, address]) =>
            address ? (
              <a
                key={label}
                href={addressUrl(address as `0x${string}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 whitespace-nowrap"
              >
                <span className="font-medium">{label}</span>
                <span className="text-muted group-hover:text-ink font-mono text-[12px] transition-colors">
                  {short(address)}
                </span>
              </a>
            ) : null,
          )}
        </div>
        <p className="text-muted hidden shrink-0 whitespace-nowrap md:block">
          Robinhood Chain testnet, chain {CHAIN_ID}. Test assets have no value.
        </p>
      </div>
    </div>
  );
}

/** `className` sets the display, so callers can hide it per breakpoint. */
export function NetworkPill({ className = "inline-flex" }: { className?: string }) {
  return (
    <span
      className={`border-line text-ink-2 min-h-10 shrink-0 items-center whitespace-nowrap gap-2 rounded-full border px-3.5 text-[13px] ${className}`}
    >
      <IconLayers className="size-4" /> Robinhood Chain testnet
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="bg-[var(--chrome)] sticky top-0 z-40 backdrop-blur-md">
      <div className={`${WRAP} flex h-[68px] items-center justify-between gap-4`}>
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="MIRK home" className="flex min-h-11 items-center">
            <Logo className="size-9" />
          </Link>
          <nav aria-label="Site" className="hidden items-center gap-1 lg:flex">
            {NAV.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="text-ink-2 hover:text-ink hover:bg-surface-2 rounded-full px-3.5 py-2 text-[14px] transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <NetworkPill className="hidden xl:inline-flex" />
          <ThemeToggle />
          <Link
            href="/app"
            className="btn btn-accent min-h-11 px-5 text-[14px]"
          >
            Open MIRK
          </Link>
          <details className="group relative lg:hidden">
            <summary
              aria-label="Menu"
              className="border-line grid size-11 cursor-pointer list-none place-items-center rounded-full border [&::-webkit-details-marker]:hidden"
            >
              <IconChevronDown className="size-4 transition-transform group-open:rotate-180" />
            </summary>
            <nav
              aria-label="Site"
              className="border-line bg-surface shadow-float absolute top-[calc(100%+8px)] right-0 w-56 rounded-[18px] border p-2"
            >
              {NAV.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="hover:bg-surface-2 flex min-h-11 items-center rounded-xl px-3 text-[15px]"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
      <FactStrip />
    </header>
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
