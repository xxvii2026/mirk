"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { useAccount } from "wagmi";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { Logo } from "@/components/brand/wordmark";
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

const TITLES: Record<string, string> = { "/app/add": "Add money", "/app/cash-out": "Cash out" };

function isActive(path: string, href: string) {
  return href === "/app" ? path === "/app" : path.startsWith(href);
}

function titleFor(path: string) {
  const exact = TITLES[path];
  if (exact) return exact;
  return [...ALL].reverse().find((i) => isActive(path, i.href))?.label ?? "MIRK";
}

function RailLink({ item, path }: { item: Item; path: string }) {
  const on = isActive(path, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={on ? "page" : undefined}
      className={cx(
        "flex min-h-11 items-center gap-3 rounded-[14px] px-3.5 text-[15px] transition-[background-color,color,box-shadow] duration-150",
        on ? "raised text-ink font-medium" : "text-ink-2 hover:text-ink hover:bg-surface/55",
      )}
    >
      <Icon className={cx("size-[18px] shrink-0", on && "text-signal")} />
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

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { address } = useAccount();

  return (
    <div className="bg-shell min-h-dvh md:flex">
      <a
        href="#main"
        className="focus:bg-surface sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:px-4 focus:py-2"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh w-[262px] shrink-0 flex-col px-4 pt-5 pb-4 md:flex">
        <Link href="/" aria-label="MIRK home" className="mb-6 flex min-h-11 w-fit items-center gap-2.5 px-2">
          <Logo className="size-9" />
          <span className="bg-signal-tint text-signal-text rounded-full px-2.5 py-0.5 text-[12px] font-medium">
            Testnet
          </span>
        </Link>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
          {PRIMARY.map((item) => (
            <RailLink key={item.href} item={item} path={path} />
          ))}
          <div className="raised mt-auto mb-3 rounded-[16px] p-3.5 text-[13px]">
            <p className="flex items-center gap-2 font-semibold">
              <span aria-hidden className="bg-signal size-2 rounded-full shadow-[0_0_0_3px_var(--signal-tint)]" />
              Testnet money
            </p>
            <p className="text-ink-2 mt-1.5 leading-relaxed">
              Testnet assets carry no value, and MIRK has not been externally audited.
            </p>
            {address ? (
              <p className="text-ink-2 border-line mt-3 flex items-center gap-2 border-t pt-3 font-mono text-[12px]">
                <IconWallet className="size-4 shrink-0" /> {short(address)}
              </p>
            ) : null}
          </div>
          {SECONDARY.map((item) => (
            <RailLink key={item.href} item={item} path={path} />
          ))}
        </nav>
        <p className="border-line text-ink-2 mt-3 flex items-center gap-2 border-t px-2 pt-3 text-[13px]">
          <IconLayers className="size-4" /> Robinhood Chain
          <span aria-hidden className="bg-signal ml-1 size-1.5 rounded-full" />
          <span className="text-signal-text font-medium">Testnet</span>
        </p>
      </aside>

      <div className="bg-canvas min-h-dvh min-w-0 flex-1 md:my-3 md:mr-3 md:min-h-[calc(100dvh-1.5rem)] md:rounded-[22px] md:shadow-[var(--shadow-workspace)]">
        <header className="border-line sticky top-0 z-30 border-b bg-[var(--chrome)] backdrop-blur-md md:rounded-t-[22px]">
          <div className="flex h-16 items-center justify-between gap-3 px-4 md:h-[68px] md:px-8">
            <Link href="/app" aria-label="MIRK home" className="flex min-h-11 items-center gap-2.5 md:hidden">
              <Logo className="size-8" />
              <span className="bg-signal-tint text-signal-text rounded-full px-2.5 py-0.5 text-[12px] font-medium">
                Testnet
              </span>
            </Link>
            <p className="hidden text-[15px] font-semibold md:block">{titleFor(path)}</p>
            <div className="flex items-center gap-2">
              {address ? (
                <span
                  className="border-line tabular hidden min-h-10 items-center gap-2 rounded-full border px-3.5 font-mono text-[12px] sm:inline-flex"
                  title="Connected public wallet"
                >
                  <IconWallet className="text-ink-2 size-4" />
                  {short(address)}
                </span>
              ) : null}
              <ThemeToggle />
              {address ? (
                <Link href="/app/add" className="btn btn-accent min-h-10 px-4 text-[14px]">
                  Add money
                </Link>
              ) : null}
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1080px] px-4 pt-6 pb-28 md:px-8 md:pt-8 md:pb-12">
          {children}
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
                    on ? "bg-surface-2 text-ink font-semibold" : "text-ink-2",
                  )}
                >
                  <Icon className={cx("size-[19px]", on && "text-signal")} />
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
