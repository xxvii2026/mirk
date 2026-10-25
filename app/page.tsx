import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { AppPreview, PaymentSteps } from "@/components/brand/landing-demos";
import { SiteFooter, SiteHeader, WRAP } from "@/components/brand/site-chrome";
import { Mark } from "@/components/brand/wordmark";
import {
  IconArrowRight,
  IconArrowUpRight,
  IconChevronDown,
  IconEye,
  IconKey,
  IconLayers,
  IconLink,
  IconLock,
  IconShield,
  IconStore,
  IconSwap,
} from "@/components/shared/icons";
import { POOL_ADDRESS, REGISTRY_ADDRESS, addressUrl } from "@/lib/robinhood/network";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const SECTION = "pt-20 sm:pt-28";

function SplitHeading({ title, children, dark }: { title: ReactNode; children: ReactNode; dark?: boolean }) {
  return (
    <div className="grid items-end gap-5 md:grid-cols-[1.15fr_1fr] md:gap-16">
      <h2 className="display-l max-w-[15ch]">{title}</h2>
      <p className={`max-w-[34rem] text-[17px] leading-relaxed ${dark ? "text-white/70" : "text-ink-2"}`}>
        {children}
      </p>
    </div>
  );
}

/** A band of ripples, the mark's waterline drawn as a divider. */
function Waterline({ className = "" }: { className?: string }) {
  const rows = [
    [0, 0.9],
    [1, 0.7],
    [2, 0.5],
  ] as const;
  return (
    <svg viewBox="0 0 1200 36" preserveAspectRatio="none" aria-hidden className={`block h-9 w-full ${className}`}>
      {rows.map(([i, o]) => {
        const y = 6 + i * 11;
        const d = Array.from({ length: 13 }, (_, k) => `Q ${k * 100 + 50} ${y + (k % 2 ? 4 : -4)} ${k * 100 + 100} ${y}`)
          .join(" ")
          .replace(/^/, `M 0 ${y} `);
        return <path key={i} d={d} fill="none" stroke="currentColor" strokeOpacity={o} strokeWidth={2.5} />;
      })}
    </svg>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-x-0 -top-20 -z-10 h-[700px] bg-[radial-gradient(55%_60%_at_50%_0%,var(--tone-100)_0%,transparent_70%)] dark:bg-[radial-gradient(55%_60%_at_50%_0%,rgba(255,255,255,0.06)_0%,transparent_70%)]"
      />
      <div className={`${WRAP} pt-16 text-center sm:pt-24`}>
        <h1 className="display-xl mx-auto max-w-[17ch]">Keep your balance below the surface.</h1>
        <p className="text-ink-2 mx-auto mt-6 max-w-[38rem] text-[17px] leading-relaxed sm:text-[18px]">
          MIRK runs on a public chain, but your balance, who you pay and how much stay off the record. Your keys stay
          on your device. Nobody, including MIRK, can move your money.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/app" className="btn btn-accent min-h-12 px-7 text-[16px]">
            Open MIRK
          </Link>
          <Link href="#how" className="btn btn-light min-h-12 px-6 text-[16px]">
            How it works <IconChevronDown className="size-4" />
          </Link>
        </div>
        <p className="text-muted mt-5 text-[13px]">Testnet only. Test assets have no value. Not externally audited.</p>
      </div>
    </section>
  );
}

function Showcase() {
  const moments: [Icon, string, string][] = [
    [IconLock, "Your balance is a set of private notes", "Only keys on this device can open them"],
    [IconShield, "Each payment is a proof made in your browser", "Checked on chain, without the amount"],
    [IconKey, "Your keys never leave your device", "MIRK's servers never see them"],
  ];
  return (
    <section className={`${WRAP} mt-12 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]`}>
      <div className="panel-soft flex flex-col justify-between gap-8 rounded-[28px] p-5 shadow-[var(--highlight)] sm:p-7">
        <p className="text-ink-2 text-[14px] font-medium">What a private payment does</p>
        <ol className="border-line-strong relative space-y-2.5 border-l pl-4 sm:ml-1">
          {moments.map(([Icon, title, sub]) => (
            <li key={title} className="raised flex items-start gap-3.5 rounded-[18px] p-4">
              <span className="bg-signal-tint text-signal-text grid size-10 shrink-0 place-items-center rounded-full">
                <Icon className="size-[18px]" />
              </span>
              <span>
                <span className="block text-[15px] leading-snug font-semibold">{title}</span>
                <span className="text-ink-2 mt-0.5 block text-[13px]">{sub}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="stage relative isolate flex min-h-[500px] items-center justify-center overflow-hidden rounded-[28px] px-4 py-10 sm:px-10">
        <Mark className="sink absolute -right-16 -bottom-24 -z-10 size-[420px] text-white/30 sm:-right-6" />
        <AppPreview />
      </div>
    </section>
  );
}

function BuiltOn() {
  const assets: [string, string][] = [
    ["ETH", "Test ether"],
    ["USDG", "Test dollars"],
  ];
  return (
    <section className={`${WRAP} mt-10`}>
      <div className="border-line grid items-center gap-5 border-t pt-7 md:grid-cols-2">
        <p className="text-ink-2 flex items-start gap-2.5 text-[14px] leading-relaxed">
          <IconLayers className="mt-0.5 size-4 shrink-0" />
          Built on Robinhood Chain testnet and Gloam&apos;s shielded pool. Hold and send these assets privately today.
        </p>
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-3 md:justify-end">
          {assets.map(([sym, name]) => (
            <li key={sym} className="flex items-center gap-3">
              <span className="btn btn-dark size-9 p-0 text-[11px] font-semibold">{sym.slice(0, 1)}</span>
              <span className="text-[17px] font-medium">{sym}</span>
              <span className="text-ink-2 text-[14px]">{name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="mt-20 sm:mt-28">
      <div className="night relative isolate overflow-hidden py-20 text-white sm:py-24">
        <div className={WRAP}>
          <SplitHeading
            dark
            title={
              <>
                Use money as usual.
                <br />
                The record stays quiet.
              </>
            }
          >
            Four steps take you from a public wallet to a private balance and back. Pick a step to see what it puts on
            chain and what sinks out of view.
          </SplitHeading>
          <div className="mt-10">
            <PaymentSteps />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureHead({
  icon: Icon,
  title,
  children,
  onAccent,
}: {
  icon: Icon;
  title: string;
  children: ReactNode;
  onAccent?: boolean;
}) {
  return (
    <div>
      <span
        className={`grid size-11 place-items-center rounded-full ${onAccent ? "bg-white text-[#0b0b0c]" : "raised"}`}
      >
        <Icon className="size-5" />
      </span>
      <h3 className="mt-5 text-[21px] font-semibold">{title}</h3>
      <p className={`mt-2 text-[15px] leading-relaxed ${onAccent ? "text-white/85" : "text-ink-2"}`}>{children}</p>
    </div>
  );
}

function Features() {
  return (
    <section className={`${WRAP} ${SECTION} text-center`}>
      <h2 className="display-l mx-auto max-w-[18ch]">On a public chain, every balance is a billboard</h2>
      <p className="text-ink-2 mx-auto mt-5 max-w-[38rem] text-[17px] leading-relaxed">
        Public blockchains show every amount and every counterparty to anyone who looks. MIRK keeps your money on a
        public chain and takes the details off the record.
      </p>

      <div className="mt-10 grid gap-4 text-left lg:grid-cols-3">
        <div className="bg-surface-2 flex flex-col gap-6 rounded-[28px] p-5 shadow-[var(--highlight)] sm:p-7">
          <FeatureHead icon={IconLock} title="A private balance">
            Your balance is the sum of notes only your device can open. Hide it on screen with one tap.
          </FeatureHead>
          <div className="raised mt-auto space-y-2 rounded-[20px] p-4">
            <p className="px-1 text-[14px] font-semibold">Example notes</p>
            {(
              [
                ["600.00", "USDG"],
                ["400.00", "USDG"],
                ["0.25", "ETH"],
              ] as const
            ).map(([v, s]) => (
              <div key={v + s} className="bg-surface-2 flex items-center justify-between rounded-xl px-3.5 py-2.5">
                <span className="tabular text-[15px] font-semibold">{v}</span>
                <span className="text-ink-2 text-[13px] font-medium">{s}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative isolate flex flex-col gap-6 overflow-hidden rounded-[28px] night p-5 text-white shadow-[var(--shadow-raised)] sm:p-7">
          <Mark className="absolute -top-20 -right-20 -z-10 size-72 text-white/10" />
          <FeatureHead icon={IconShield} title="Pay an account number" onAccent>
            Pay a 12-digit MIRK number. No name, no wallet address and no amount reach the chain.
          </FeatureHead>
          <div className="mt-auto rounded-[20px] border border-white/20 bg-white/10 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
            <div className="bg-surface text-ink rounded-[15px] p-5">
              <p className="text-ink-2 text-[13px]">Send to</p>
              <p className="tabular mt-1 font-mono text-[17px]">4829 1630 7714</p>
              <div className="border-line my-4 border-t" />
              <p className="text-ink-2 text-[13px]">Amount</p>
              <p className="tabular mt-1 text-[28px] font-semibold tracking-[-0.03em]">
                250.00 <span className="text-ink-2 text-[15px] font-medium">USDG</span>
              </p>
              <p className="text-ink-2 mt-3 text-[13px] font-medium">Recorded on chain as a private transfer</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-2 flex flex-col gap-6 rounded-[28px] p-5 shadow-[var(--highlight)] sm:p-7">
          <FeatureHead icon={IconLink} title="Claim links">
            Pay someone who has no account yet. Whoever opens the link claims the money into a new account.
          </FeatureHead>
          <div className="raised mt-auto rounded-[20px] p-5">
            <p className="text-[15px] font-semibold">A link worth 40.00 USDG</p>
            <p className="bg-surface-2 text-ink-2 mt-3 truncate rounded-xl px-3.5 py-2.5 font-mono text-[12px]">
              mirk…/claim#m1.••••••••••••
            </p>
            <p className="text-ink-2 mt-3 text-[13px] leading-relaxed">
              The secret lives after the #, so it never reaches a server.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Surface() {
  const above = [
    "Deposits: wallet, asset and amount",
    "Cash outs: destination, asset and amount",
    "That a private transfer happened",
  ];
  const below = [
    "Note secrets that can spend your money",
    "Receive keys for incoming payments",
    "Claim links you created",
    "Your balance and private activity",
  ];
  return (
    <section className={`${WRAP} ${SECTION}`}>
      <SplitHeading
        title={
          <>
            Some of it shows.
            <br />
            Most of it sinks.
          </>
        }
      >
        MIRK never holds your money. It sits in Gloam&apos;s shielded-pool contract, and the keys that can spend it are
        encrypted in your browser.
      </SplitHeading>

      <div className="mt-10 overflow-hidden rounded-[28px] shadow-[var(--shadow-raised)]">
        <div className="bg-surface-2 px-5 pt-7 pb-6 sm:px-9 sm:pt-9">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="flex items-center gap-2 text-[22px] font-semibold tracking-[-0.03em]">
              <IconEye className="text-ink-2 size-5" /> Above the surface
            </p>
            <p className="text-ink-2 text-[14px]">Public on chain, for anyone to read</p>
          </div>
          <ul className="mt-6 grid gap-2.5 md:grid-cols-3">
            {above.map((x) => (
              <li key={x} className="raised flex items-center gap-3 rounded-[14px] px-4 py-3.5 text-[15px]">
                <span aria-hidden className="hatch size-4 shrink-0 rounded-[5px]" /> {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="night relative text-white">
          <Waterline className="bg-surface-2 text-[#0b0b0c] dark:text-white/40" />
          <div className="px-5 pt-6 pb-8 sm:px-9 sm:pb-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="flex items-center gap-2 text-[22px] font-semibold tracking-[-0.03em]">
                <IconLock className="size-5 text-white/70" /> Below the surface
              </p>
              <p className="text-[14px] text-white/65">On your device only, encrypted, never sent</p>
            </div>
            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2 md:grid-cols-4">
              {below.map((x) => (
                <li
                  key={x}
                  className="rounded-[14px] border border-white/12 bg-white/[0.06] px-4 py-3.5 text-[15px] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                >
                  {x}
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-[46rem] text-[14px] leading-relaxed text-white/60">
              MIRK&apos;s servers see an account number and its public receive tag at registration, and proof data that
              is already public when relaying. No logs are kept.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Verify() {
  const rows: [string, string | null, string][] = [
    ["Gloam shielded pool", POOL_ADDRESS, "Holds every deposit. From @gloamtrade/sdk 0.2.2."],
    ["MIRK account registry", REGISTRY_ADDRESS, "Maps account numbers to receive tags. Holds no funds."],
  ];
  return (
    <section className={`${WRAP} ${SECTION}`}>
      <div className="panel-soft grid gap-8 rounded-[28px] p-6 shadow-[var(--highlight)] sm:p-10 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="display-l max-w-[17ch]">Every contract is public, and anyone can read it.</h2>
          <p className="text-ink-2 mt-5 max-w-[30rem] text-[17px] leading-relaxed">
            The registry is non-upgradeable and verified on Sourcify. Registrations are permanent; the owner can only
            rotate the registrar.
          </p>
          <Link href="/contracts" className="btn btn-light mt-7 min-h-12 px-6 text-[16px]">
            See the contracts <IconArrowRight className="size-4" />
          </Link>
        </div>
        <div className="raised space-y-1 rounded-[22px] p-2.5">
          {rows.map(([name, address, note]) => (
            <div key={name} className="hover:bg-surface-2 rounded-[16px] p-4 transition-colors">
              <p className="text-[15px] font-semibold">{name}</p>
              {address ? (
                <a
                  href={addressUrl(address as `0x${string}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-signal-text mt-1 inline-flex items-center gap-1 font-mono text-[12px] break-all hover:underline"
                >
                  {address} <IconArrowUpRight className="size-3.5 shrink-0" />
                </a>
              ) : (
                <p className="text-ink-2 mt-1 text-[13px]">Not configured on this deployment</p>
              )}
              <p className="text-ink-2 mt-1.5 text-[13px]">{note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Honest() {
  const items: [string, string][] = [
    ["Not a custodian", "Funds sit in Gloam's deployed contract. MIRK cannot freeze, move or recover them."],
    ["Not on mainnet", "Robinhood Chain testnet only. Test assets have no value. Mainnet comes later."],
    ["Not audited", "MIRK has not been externally audited. Privacy grows with the number of people using the pool."],
    ["Not recoverable for you", "Export an encrypted backup from Settings. Nobody can restore lost keys."],
  ];
  const soon: [Icon, string][] = [
    [IconSwap, "Private trading"],
    [IconStore, "Marketplace"],
  ];
  return (
    <section className={`${WRAP} ${SECTION} grid gap-8 lg:grid-cols-[1fr_1.4fr]`}>
      <div>
        <h2 className="display-l">What MIRK is not</h2>
        <div className="mt-7 flex flex-wrap gap-2">
          {soon.map(([Icon, label]) => (
            <span
              key={label}
              className="raised text-ink-2 inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-[14px]"
            >
              <Icon className="size-4" /> {label}
              <span className="bg-surface-2 rounded-full px-2 py-0.5 text-[11px] font-medium">Coming soon</span>
            </span>
          ))}
        </div>
      </div>
      <ul className="grid gap-x-8 sm:grid-cols-2">
        {items.map(([t, d]) => (
          <li key={t} className="border-line border-t py-5">
            <h3 className="text-[17px] font-semibold">{t}</h3>
            <p className="text-ink-2 mt-2 text-[15px] leading-relaxed">{d}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Closing() {
  return (
    <section className={`${WRAP} ${SECTION} pb-20 sm:pb-28`}>
      <div className="night relative isolate overflow-hidden rounded-[32px] px-6 pt-16 pb-0 text-center text-white shadow-[var(--shadow-raised)] sm:pt-20">
        <Mark className="sink mx-auto size-20 text-white" />
        <h2 className="display-l mx-auto mt-8 max-w-[16ch]">Your private balance is one deposit away.</h2>
        <p className="mx-auto mt-5 max-w-[34rem] text-[17px] leading-relaxed text-white/70">
          Connect any EVM wallet, add test funds and get your account number. No sign-up and no email.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/app" className="btn btn-accent min-h-12 px-7 text-[16px]">
            Open MIRK
          </Link>
          <Link
            href="/docs"
            className="btn min-h-12 border-white/20 bg-white/10 px-6 text-[16px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-white/15"
          >
            Read how it works
          </Link>
        </div>
        <Waterline className="mt-16 text-white/50" />
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="bg-canvas min-h-dvh">
      <SiteHeader />
      <main>
        <Hero />
        <Showcase />
        <BuiltOn />
        <HowItWorks />
        <Features />
        <Surface />
        <Verify />
        <Honest />
        <Closing />
      </main>
      <SiteFooter />
    </div>
  );
}
