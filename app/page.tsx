import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { AppPreview, PaymentSteps } from "@/components/brand/landing-demos";
import { SiteFooter, SiteHeader, WRAP } from "@/components/brand/site-chrome";
import { Mark } from "@/components/brand/wordmark";
import {
  IconArrowRight,
  IconArrowUpRight,
  IconChevronDown,
  IconKey,
  IconLayers,
  IconLink,
  IconLock,
  IconShield,
  IconSwap,
  IconStore,
} from "@/components/shared/icons";
import { POOL_ADDRESS, REGISTRY_ADDRESS, addressUrl } from "@/lib/robinhood/network";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="bg-ink text-on-ink hover:bg-ink/85 inline-flex min-h-12 items-center rounded-full px-6 text-[16px] font-medium transition-[background-color,transform] duration-150 active:scale-[0.98]"
    >
      {children}
    </Link>
  );
}

function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="border-line-strong bg-surface hover:bg-surface-2 inline-flex min-h-12 items-center gap-2 rounded-full border px-6 text-[16px] font-medium transition-colors"
    >
      {children}
    </Link>
  );
}

function SplitHeading({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="grid items-end gap-6 md:grid-cols-[1.15fr_1fr] md:gap-16">
      <h2 className="display-l max-w-[14ch]">{title}</h2>
      <p className="text-ink-2 max-w-[34rem] text-[17px] leading-relaxed">{children}</p>
    </div>
  );
}

function Hero() {
  return (
    <section className={`${WRAP} pt-16 text-center sm:pt-20`}>
      <Link
        href="/app"
        className="border-line hover:border-line-strong text-ink-2 inline-flex min-h-10 items-center gap-2.5 rounded-full border px-4 text-[13px] transition-colors"
      >
        <Mark className="text-ink h-3.5 w-auto" /> Live on Robinhood Chain testnet
        <IconArrowRight className="size-3.5" />
      </Link>
      <h1 className="display-xl mx-auto mt-8 max-w-[23ch]">
        Money on a public chain, with your balance and payments kept off the record.
      </h1>
      <p className="text-ink-2 mx-auto mt-6 max-w-[38rem] text-[17px] leading-relaxed">
        Hold, send and receive without anyone reading your balance or the amounts you move. Your keys stay on your
        device. Nobody, including MIRK, can move your money.
      </p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <PrimaryLink href="/app">Open MIRK</PrimaryLink>
        <SecondaryLink href="#how">
          How it works <IconChevronDown className="size-4" />
        </SecondaryLink>
      </div>
      <p className="text-muted mt-5 text-[13px]">Testnet only. Test assets have no value. Not externally audited.</p>
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
    <section className={`${WRAP} mt-14 grid gap-5 lg:grid-cols-[0.78fr_1.22fr]`}>
      <div className="panel-soft flex flex-col justify-between gap-10 rounded-[28px] p-5 sm:p-7">
        <p className="text-ink-2 text-[14px]">What a private payment does</p>
        <ol className="border-line-strong relative space-y-3 border-l pl-4 sm:ml-1">
          {moments.map(([Icon, title, sub]) => (
            <li key={title} className="bg-surface shadow-card flex items-start gap-3.5 rounded-[18px] p-4">
              <span className="bg-mint-50 text-signal-text dark:bg-signal-tint grid size-10 shrink-0 place-items-center rounded-full">
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
      <div className="stage relative flex min-h-[520px] items-center justify-center overflow-hidden rounded-[28px] px-4 py-12 sm:px-10">
        <AppPreview />
        <span className="bg-surface shadow-float absolute top-8 right-8 hidden size-16 place-items-center rounded-full sm:grid">
          <Mark className="h-8 w-auto" />
        </span>
        <span className="bg-surface shadow-float text-signal-text absolute bottom-10 left-8 hidden size-12 place-items-center rounded-full sm:grid">
          <IconLock className="size-5" />
        </span>
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
    <section className={`${WRAP} mt-14`}>
      <div className="border-line grid items-center gap-6 border-t pt-8 md:grid-cols-2">
        <p className="text-ink-2 flex items-start gap-2.5 text-[14px] leading-relaxed">
          <IconLayers className="mt-0.5 size-4 shrink-0" />
          Built on Robinhood Chain testnet and Gloam&apos;s shielded pool. Hold and send these assets privately today.
        </p>
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-3 md:justify-end">
          {assets.map(([sym, name]) => (
            <li key={sym} className="flex items-center gap-3">
              <span className="bg-ink text-on-ink grid size-9 place-items-center rounded-full text-[11px] font-semibold">
                {sym.slice(0, 1)}
              </span>
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
    <section id="how" className={`${WRAP} pt-28 sm:pt-36`}>
      <SplitHeading
        title={
          <>
            Use money as usual.
            <br />
            The record stays quiet.
          </>
        }
      >
        Four steps take you from a public wallet to a private balance and back. Pick a step to see exactly what it
        puts on chain and what it keeps to you.
      </SplitHeading>
      <div className="mt-12">
        <PaymentSteps />
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className={`${WRAP} pt-28 text-center sm:pt-36`}>
      <h2 className="display-l mx-auto max-w-[18ch]">On a public chain, every balance is a billboard</h2>
      <p className="text-ink-2 mx-auto mt-5 max-w-[38rem] text-[17px] leading-relaxed">
        Public blockchains show every amount and every counterparty to anyone who looks. MIRK keeps your money on a
        public chain and takes the details off the record.
      </p>

      <div className="mt-14 grid gap-5 text-left lg:grid-cols-3">
        <div className="bg-surface-2 flex flex-col gap-6 rounded-[28px] p-5 sm:p-7">
          <FeatureHead icon={IconLock} title="A private balance">
            Your balance is the sum of notes only your device can open. Hide it on screen with one tap.
          </FeatureHead>
          <div className="bg-surface shadow-card mt-auto space-y-2 rounded-[20px] p-5">
            <p className="text-[15px] font-semibold">Example notes</p>
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

        <div className="bg-mint-600 flex flex-col gap-6 rounded-[28px] p-5 text-white sm:p-7">
          <FeatureHead icon={IconShield} title="Pay an account number" onAccent>
            Pay a 12-digit MIRK number. No name, no wallet address and no amount reach the chain.
          </FeatureHead>
          <div className="mt-auto rounded-[20px] border border-white/25 bg-white/10 p-3">
            <div className="bg-surface text-ink rounded-[16px] p-5">
              <p className="text-ink-2 text-[13px]">Send to</p>
              <p className="tabular mt-1 font-mono text-[17px]">4829 1630 7714</p>
              <div className="border-line my-4 border-t" />
              <p className="text-ink-2 text-[13px]">Amount</p>
              <p className="tabular mt-1 text-[28px] font-semibold tracking-[-0.03em]">
                250.00 <span className="text-ink-2 text-[15px] font-medium">USDG</span>
              </p>
              <p className="text-signal-text mt-3 text-[13px] font-medium">Recorded on chain as a private transfer</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-2 flex flex-col gap-6 rounded-[28px] p-5 sm:p-7">
          <FeatureHead icon={IconLink} title="Claim links">
            Pay someone who has no account yet. Whoever opens the link claims the money into a new account.
          </FeatureHead>
          <div className="bg-surface shadow-card mt-auto rounded-[20px] p-5">
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
        className={`grid size-11 place-items-center rounded-full ${onAccent ? "text-mint-800 bg-white" : "bg-surface"}`}
      >
        <Icon className="size-5" />
      </span>
      <h3 className="mt-6 text-[21px] font-semibold">{title}</h3>
      <p className={`mt-2 text-[15px] leading-relaxed ${onAccent ? "text-white/80" : "text-ink-2"}`}>{children}</p>
    </div>
  );
}

function WhereItSits() {
  const device = [
    "Note secrets that can spend your money",
    "Receive keys for incoming payments",
    "Claim links you created",
    "Your private activity",
  ];
  const chain = [
    "Deposits: wallet, asset and amount",
    "Cash outs: destination, asset and amount",
    "That a private transfer happened",
  ];
  return (
    <section className={`${WRAP} pt-28 sm:pt-36`}>
      <SplitHeading
        title={
          <>
            Two places,
            <br />
            one balance.
          </>
        }
      >
        MIRK never holds your money. It sits in Gloam&apos;s shielded-pool contract, and the keys that can spend it are
        encrypted in your browser.
      </SplitHeading>
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        <div className="stage-soft rounded-[28px] p-5 sm:p-8">
          <p className="text-mint-800 text-[14px] font-medium dark:text-mint-300">On your device only</p>
          <p className="mt-2 text-[28px] font-semibold tracking-[-0.03em]">Encrypted, never sent</p>
          <ul className="mt-8 space-y-2">
            {device.map((x) => (
              <li key={x} className="bg-surface/85 flex items-center gap-3 rounded-[14px] px-4 py-3 text-[15px]">
                <IconLock className="text-signal-text size-4 shrink-0" /> {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-surface-2 rounded-[28px] p-5 sm:p-8">
          <p className="text-ink-2 text-[14px] font-medium">Public on chain</p>
          <p className="mt-2 text-[28px] font-semibold tracking-[-0.03em]">Only the edges show</p>
          <ul className="mt-8 space-y-2">
            {chain.map((x) => (
              <li key={x} className="bg-surface flex items-center gap-3 rounded-[14px] px-4 py-3 text-[15px]">
                <span aria-hidden className="hatch size-4 shrink-0 rounded-[5px]" /> {x}
              </li>
            ))}
          </ul>
          <p className="text-ink-2 mt-6 text-[14px] leading-relaxed">
            MIRK&apos;s servers see an account number and its public receive tag at registration, and proof data that
            is already public when relaying. No logs are kept.
          </p>
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
    <section className={`${WRAP} pt-28 sm:pt-36`}>
      <div className="bg-surface-2 grid gap-10 rounded-[28px] p-6 sm:p-10 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <h2 className="display-l max-w-[17ch]">Every contract is public, and anyone can read it.</h2>
          <p className="text-ink-2 mt-5 max-w-[30rem] text-[17px] leading-relaxed">
            The registry is non-upgradeable and verified on Sourcify. Registrations are permanent; the owner can only
            rotate the registrar.
          </p>
          <div className="mt-8">
            <SecondaryLink href="/contracts">
              See the contracts <IconArrowRight className="size-4" />
            </SecondaryLink>
          </div>
        </div>
        <div className="bg-surface shadow-card space-y-1 rounded-[22px] p-3">
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
    <section className={`${WRAP} grid gap-10 pt-28 sm:pt-36 lg:grid-cols-[1fr_1.4fr]`}>
      <div>
        <h2 className="display-l">What MIRK is not</h2>
        <div className="mt-8 flex flex-wrap gap-2">
          {soon.map(([Icon, label]) => (
            <span
              key={label}
              className="border-line text-ink-2 inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-[14px]"
            >
              <Icon className="size-4" /> {label}
              <span className="bg-surface-2 rounded-full px-2 py-0.5 text-[11px] font-medium">Coming soon</span>
            </span>
          ))}
        </div>
      </div>
      <ul className="grid gap-x-8 sm:grid-cols-2">
        {items.map(([t, d]) => (
          <li key={t} className="border-line border-t py-6">
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
    <section className={`${WRAP} pt-28 pb-28 sm:pt-36`}>
      <div className="stage-soft rounded-[28px] px-6 py-20 text-center sm:py-24">
        <Mark className="mx-auto h-12 w-auto" />
        <h2 className="display-l mx-auto mt-8 max-w-[16ch]">Your private balance is one deposit away.</h2>
        <p className="text-ink-2 mx-auto mt-5 max-w-[34rem] text-[17px] leading-relaxed">
          Connect any EVM wallet, add test funds and get your account number. No sign-up and no email.
        </p>
        <div className="mt-9">
          <PrimaryLink href="/app">Open MIRK</PrimaryLink>
        </div>
        <Link
          href="/docs"
          className="text-ink-2 hover:text-ink mt-6 inline-block text-[14px] underline underline-offset-4"
        >
          Read how it works first
        </Link>
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
        <WhereItSits />
        <Verify />
        <Honest />
        <Closing />
      </main>
      <SiteFooter />
    </div>
  );
}
