"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAccount } from "wagmi";
import { NetworkPill } from "@/components/brand/site-chrome";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { Wordmark } from "@/components/brand/wordmark";
import { IconClock, IconHome, IconReceive, IconSend, IconSettings, IconStore, IconSwap, IconWallet } from "./icons";
import { cx } from "./ui";

const NAV = [
  { href: "/app", label: "Home", icon: IconHome, mobile: true },
  { href: "/app/send", label: "Send", icon: IconSend, mobile: true },
  { href: "/app/receive", label: "Receive", icon: IconReceive, mobile: true },
  { href: "/app/activity", label: "Activity", icon: IconClock, mobile: true },
  { href: "/app/trade", label: "Trade", icon: IconSwap, soon: true },
  { href: "/app/marketplace", label: "Marketplace", icon: IconStore, soon: true },
  { href: "/app/settings", label: "Settings", icon: IconSettings, mobile: true },
] as const;

function isActive(path: string, href: string) {
  return href === "/app" ? path === "/app" : path.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { address } = useAccount();

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="focus:bg-surface sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <header className="border-line sticky top-0 z-30 border-b bg-[var(--chrome)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/app" aria-label="MIRK home" className="flex min-h-11 items-center">
              <Wordmark className="text-[24px]" />
            </Link>
            <span className="bg-signal-tint text-signal-text rounded-full px-2.5 py-0.5 text-[12px] font-medium">
              Testnet
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NetworkPill className="hidden lg:inline-flex" />
            {address ? (
              <span
                className="border-line tabular hidden min-h-10 items-center gap-2 rounded-full border px-3.5 font-mono text-[12px] sm:inline-flex"
                title="Connected public wallet"
              >
                <IconWallet className="text-ink-2 size-4" />
                {address.slice(0, 6)}…{address.slice(-4)}
              </span>
            ) : null}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1240px] gap-8 px-4 sm:px-6">
        <nav
          aria-label="Main"
          className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-56 shrink-0 flex-col gap-1 py-8 md:flex"
        >
          {NAV.map((item) => {
            const on = isActive(path, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={cx(
                  "flex min-h-11 items-center gap-3 rounded-[14px] px-3 text-[15px] transition-colors",
                  on ? "bg-surface text-ink shadow-card font-medium" : "text-ink-2 hover:text-ink hover:bg-surface/60",
                )}
              >
                <Icon className={cx("size-[18px]", on && "text-signal-text")} />
                <span className="flex-1">{item.label}</span>
                {"soon" in item ? (
                  <span className="bg-surface-3 text-ink-2 rounded-full px-2 py-0.5 text-[10px] font-medium">Soon</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <main id="main" className="min-w-0 flex-1 pt-6 pb-28 md:py-8">
          {children}
        </main>
      </div>

      <nav
        aria-label="Main"
        className="border-line fixed inset-x-0 bottom-0 z-30 border-t bg-[var(--chrome)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {NAV.filter((i) => "mobile" in i).map((item) => {
            const on = isActive(path, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={on ? "page" : undefined}
                  className={cx(
                    "flex min-h-16 flex-col items-center justify-center gap-1 text-[11px]",
                    on ? "text-ink font-medium" : "text-ink-2",
                  )}
                >
                  <span
                    className={cx(
                      "grid h-7 w-12 place-items-center rounded-full transition-colors",
                      on && "bg-signal-tint text-signal-text",
                    )}
                  >
                    <Icon className="size-[18px]" />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
