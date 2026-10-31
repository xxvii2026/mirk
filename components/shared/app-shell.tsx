"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ComponentType, type ReactNode, type SVGProps } from "react";
import { useAppKit } from "@reown/appkit/react";
import { useAccount } from "wagmi";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { Logo } from "@/components/brand/wordmark";
import { REOWN_PROJECT_ID } from "@/lib/reown/config";
import {
  IconClock,
  IconHome,
  IconLayers,
  IconReceive,
  IconSend,
  IconSettings,
  IconShield,
  IconStore,
  IconSwap,
  IconWallet,
} from "./icons";
import { cx } from "./ui";

type Item = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  mobile?: boolean;
  soon?: boolean;
};

const PRIMARY: Item[] = [
  { href: "/app", label: "Home", icon: IconHome, mobile: true },
  { href: "/app/send", label: "Send", icon: IconSend, mobile: true },
  { href: "/app/receive", label: "Receive", icon: IconReceive, mobile: true },
  { href: "/app/activity", label: "Activity", icon: IconClock, mobile: true },
];

const SECONDARY: Item[] = [
  { href: "/app/trade", label: "Trade", icon: IconSwap, soon: true },
  { href: "/app/marketplace", label: "Marketplace", icon: IconStore, soon: true },
  { href: "/app/settings", label: "Settings", icon: IconSettings, mobile: true },
  { href: "/docs", label: "How it works", icon: IconShield },
];

const ALL = [...PRIMARY, ...SECONDARY];

function isActive(path: string, href: string) {
  return href === "/app" ? path === "/app" : path.startsWith(href);
}

function RailLink({ item, path }: { item: Item; path: string }) {
  const on = isActive(path, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={on ? "page" : undefined}
      className={cx(
        "flex min-h-10 items-center gap-3 rounded-[12px] px-3 text-[15px] transition-colors duration-150",
        on ? "bg-signal-tint text-signal-text font-medium" : "text-ink-2 hover:text-ink hover:bg-surface-2/60",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.soon ? (
        <span className="bg-surface-3 text-ink-2 rounded-full px-2 py-0.5 text-[10px] font-medium">Soon</span>
      ) : null}
    </Link>
  );
}

function short(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** The wallet pill at the foot of the rail: connect when signed out, the address when in. */
function WalletPill() {
  const { address } = useAccount();
  const { open } = useAppKit();
  return address ? (
    <button
      type="button"
      onClick={() => open({ view: "Account" })}
      className="border-line hover:bg-surface-2 tabular flex min-h-11 w-full items-center justify-center gap-2 rounded-full border font-mono text-[13px] transition-colors"
      title="Connected public wallet"
    >
      <IconWallet className="text-ink-2 size-4" /> {short(address)}
    </button>
  ) : (
    <button
      type="button"
      onClick={() => open({ view: "Connect" })}
      className="btn btn-accent min-h-11 w-full text-[15px]"
    >
      <IconWallet className="size-4" /> Connect wallet
    </button>
  );
}

const noop = () => () => {};

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  // AppKit exists only in the browser, so the wallet pill waits for the client.
  const client = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

  return (
    <div className="bg-ground min-h-dvh md:flex">
      <a
        href="#main"
        className="focus:bg-surface sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:px-4 focus:py-2"
      >
        Skip to content
      </a>

      {/* The rail floats as its own panel. */}
      <aside className="border-line bg-surface sticky top-3 m-3 hidden h-[calc(100dvh-1.5rem)] w-[248px] shrink-0 flex-col rounded-[20px] border p-3 md:flex">
        <Link href="/" aria-label="Mirk home" className="flex min-h-11 w-fit items-center gap-2.5 px-2">
          <Logo className="size-7" />
          <span className="text-[19px] font-medium tracking-[-0.02em]">Mirk</span>
        </Link>
        <div className="bg-surface-2 mt-3 flex items-center gap-3 rounded-[14px] px-3 py-2.5">
          <span className="bg-ink text-on-ink grid size-8 shrink-0 place-items-center rounded-[9px]">
            <IconLayers className="size-4" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[14px] font-medium">Robinhood Chain</span>
            <span className="text-ink-2 block text-[12px]">Testnet</span>
          </span>
        </div>

        <nav aria-label="Main" className="mt-4 flex flex-1 flex-col gap-0.5">
          {PRIMARY.map((item) => (
            <RailLink key={item.href} item={item} path={path} />
          ))}
          <div className="mt-auto flex flex-col gap-0.5">
            {SECONDARY.map((item) => (
              <RailLink key={item.href} item={item} path={path} />
            ))}
          </div>
        </nav>
        <div className="border-line mt-3 flex items-center gap-2 border-t pt-3">
          {REOWN_PROJECT_ID && client ? <WalletPill /> : <span className="min-h-11 flex-1" />}
          <ThemeToggle />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-line sticky top-0 z-30 border-b bg-[var(--chrome)] backdrop-blur-md md:hidden">
          <div className="flex h-16 items-center justify-between gap-3 px-4">
            <Link href="/app" aria-label="Mirk home" className="flex min-h-11 items-center gap-2">
              <Logo className="size-7" />
              <span className="text-[18px] font-medium tracking-[-0.02em]">Mirk</span>
            </Link>
            <div className="flex items-center gap-1">
              {REOWN_PROJECT_ID && client ? <WalletPill /> : null}
              <span className="text-ink-2 hidden text-[12px] sm:inline">Testnet</span>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1080px] px-4 pt-6 pb-28 md:px-10 md:pt-10 md:pb-10">
          {children}
          <footer className="border-line text-ink-2 mt-14 flex flex-col gap-3 border-t pt-5 text-[13px] sm:flex-row sm:items-center sm:justify-between">
            <p className="flex gap-4">
              {(
                [
                  ["Docs", "/docs"],
                  ["Privacy", "/privacy"],
                  ["Risk", "/risk"],
                ] as const
              ).map(([label, href]) => (
                <Link key={href} href={href} className="hover:text-ink transition-colors">
                  {label}
                </Link>
              ))}
            </p>
          </footer>
        </main>
      </div>

      <nav
        aria-label="Main"
        className="border-line fixed inset-x-0 bottom-0 z-30 border-t bg-[var(--chrome)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5 gap-1 px-2 py-1.5">
          {ALL.filter((i) => i.mobile).map((item) => {
            const on = isActive(path, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={on ? "page" : undefined}
                  className={cx(
                    "flex min-h-14 flex-col items-center justify-center gap-1 rounded-[14px] text-[11px] transition-colors",
                    on ? "bg-signal-tint text-signal-text font-medium" : "text-ink-2",
                  )}
                >
                  <Icon className="size-[19px]" />
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
