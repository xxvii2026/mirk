import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { SiteFooter, SiteHeader, WRAP } from "@/components/brand/site-chrome";
import { Mark } from "@/components/brand/wordmark";
import { AppWindow } from "@/components/landing/app-window";
import { KeyLens } from "@/components/landing/key-lens";
import { ScrollFX } from "@/components/landing/scroll-fx";
import { VisibilitySlider } from "@/components/landing/visibility-slider";
import { IconArrowRight, IconChevronDown } from "@/components/shared/icons";
import { HiddenDots } from "@/components/shared/ui";
import { VoxelTopographyGrid } from "@/components/ui/voxel-topography-grid";
import { CHAIN_ID, POOL_ADDRESS } from "@/lib/robinhood/network";

const DISCLAIMER = "Testnet only. Test assets have no value. Not externally audited.";

function short(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** The mark as the page's character: floating, with a soft shadow beneath. */
function Character({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`float inline-block ${className}`}>
      <Mark className="size-full text-white drop-shadow-[0_18px_28px_rgba(0,0,0,0.65)]" />
    </span>
  );
}

function Copy({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div>
      <h2 className="display-l max-w-[13ch]">{title}</h2>
      <p className="text-ink-2 mt-6 max-w-[30rem] text-[17px] leading-relaxed">{children}</p>
    </div>
  );
}

/** Entrance motion for a [data-scroll] block: rises into place. */
const rise: CSSProperties = {
  transform: "translateY(calc((1 - var(--e)) * 60px))",
  opacity: "calc(0.15 + var(--e) * 0.85)",
};

function Hero() {
  return (
    <section data-scroll className="relative isolate overflow-hidden pt-[76px] pb-24 sm:pt-20">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-[1040px] [mask-image:linear-gradient(180deg,#000_40%,transparent_100%)] opacity-35"
      >
        <VoxelTopographyGrid
          tileSize={40}
          maxHeight={64}
          primaryColor="#8b7bd8"
          wireColor="rgba(11, 11, 12, 0.7)"
          speed={0.02}
          maxDpr={0.5}
          fps={30}
        />
        {/* A pool of dark behind the copy, so the type reads over the field. */}
        <div className="absolute inset-0 bg-[radial-gradient(42%_38%_at_50%_34%,rgba(11,11,12,0.92)_0%,rgba(11,11,12,0.6)_55%,rgba(11,11,12,0)_100%)]" />
      </div>

      <div className={`${WRAP} pt-14 text-center sm:pt-20`}>
        <Character className="mx-auto size-[72px]" />
        <h1
          className="display-xl mx-auto mt-8 max-w-[15ch]"
          style={{ opacity: "calc(1 - var(--x) * 2.2)", transform: "translateY(calc(var(--x) * -80px))" }}
        >
          Private money for the open economy.
        </h1>
        <p className="text-ink-2 mx-auto mt-6 max-w-[36rem] text-[17px] leading-relaxed sm:text-[18px]">
          Hold, send and receive on a public chain without putting your balance or the amounts you move on the record.
          Your keys stay on your device.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/app" className="btn btn-accent min-h-12 px-7 text-[16px]">
            Open mirk <IconArrowRight className="size-4" />
          </Link>
          <Link href="#how" className="btn btn-light min-h-12 px-6 text-[16px]">
            How it works <IconChevronDown className="size-4" />
          </Link>
        </div>
        <p className="text-ink-2 mt-5 text-[12px]">{DISCLAIMER}</p>
      </div>

      <div data-scroll className="mx-auto mt-20 max-w-[1040px] px-4 sm:px-6">
        <div
          className="origin-top will-change-transform"
          style={{
            transform: "perspective(1600px) rotateX(calc((1 - var(--e)) * 26deg)) scale(calc(0.86 + var(--e) * 0.14))",
            opacity: "calc(0.35 + var(--e) * 0.65)",
          }}
        >
          <AppWindow />
        </div>
      </div>
    </section>
  );
}

function PayANumber() {
  const cards = [
    { k: "Send to", v: "4829 1630 7714", a: "250.00 USDG", note: "Private transfer" },
    { k: "Claim link", v: "mirk…/claim#m1.••••••", a: "40.00 USDG", note: "For someone without an account" },
    { k: "Your account number", v: "7709 8827 9921", a: "", note: "Share it to get paid" },
  ];
  return (
    <section id="how" className="relative pt-20 pb-44 sm:pb-52">
      <div className={`${WRAP} grid items-center gap-16 lg:grid-cols-[1fr_1.05fr]`}>
        <div data-scroll style={rise}>
          <Copy title="Pay a number, not an address.">
            Every mirk account has a 12-digit number. It reveals no name, no wallet and no balance. Pay it like a bank
            account, or send a claim link to someone who has no account yet.
          </Copy>
          <Character className="mt-10 hidden size-16 lg:block" />
        </div>
        <div data-scroll className="relative mx-auto h-[400px] w-full max-w-[460px]">
          {cards.map((c, i) => (
            <div
              key={c.k}
              className="raised absolute inset-x-0 rounded-[22px] p-5"
              style={{
                top: `${i * 132}px`,
                zIndex: 3 - i,
                transform: `translateY(calc((1 - var(--e)) * ${70 + i * 70}px)) rotate(calc((1 - var(--e)) * ${
                  (i - 1) * 5
                }deg))`,
                opacity: "calc(0.2 + var(--e) * 0.8)",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-ink-2 text-[12px]">{c.k}</p>
                  <p className="tabular mt-1 truncate font-mono text-[16px]">{c.v}</p>
                </div>
                {c.a ? <p className="tabular shrink-0 text-[20px] font-semibold tracking-[-0.03em]">{c.a}</p> : null}
              </div>
              <p className="text-ink-2 mt-3 text-[13px]">{c.note}</p>
            </div>
          ))}
          <p className="text-ink-2 absolute -bottom-6 left-1 text-[12px]">Example values</p>
        </div>
      </div>
    </section>
  );
}

/** A smaller heading and paragraph, for two stories told side by side. */
function Pair({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-7">
      <h3 className="display-m max-w-[16ch]">{title}</h3>
      <p className="mt-4 max-w-[30rem] text-[16px] leading-relaxed text-white/65">{children}</p>
    </div>
  );
}

function Night() {
  const rows: [string, ReactNode][] = [
    ["Your balance", <HiddenDots key="b" />],
    ["Your last payment", <HiddenDots key="l" />],
    ["Who you paid", "Not on chain"],
  ];
  return (
    <section id="privacy" className="relative -mt-24 text-white">
      <div className="relative isolate overflow-hidden bg-[#111213] [clip-path:ellipse(150%_100%_at_50%_100%)] sm:[clip-path:ellipse(115%_100%_at_50%_100%)]">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(55%_28%_at_50%_0%,rgba(185,166,255,0.13)_0%,rgba(185,166,255,0)_70%)]"
        />

        <div className={`${WRAP} pt-40`}>
          <div data-scroll style={rise} className="grid items-end gap-6 lg:grid-cols-[1fr_1fr]">
            <h2 className="display-l max-w-[13ch]">
              On the record, it reads as <span className="text-signal">noise.</span>
            </h2>
            <p className="max-w-[30rem] text-[17px] leading-relaxed text-white/65 lg:justify-self-end">
              Anyone can see that an entry landed and when. Your key, which never leaves your device, is what turns it
              back into names and amounts. Move across the ledger to read it the way you do.
            </p>
          </div>
          <div data-scroll className="mt-12" style={rise}>
            <KeyLens />
          </div>
        </div>

        <div className={`${WRAP} grid gap-x-8 gap-y-16 pt-28 pb-32 md:grid-cols-2`}>
          <div data-scroll className="flex flex-col" style={rise}>
            <Pair title="Your balance keeps quiet.">
              On a public chain, every balance is a billboard. mirk keeps your money in Gloam&apos;s shielded pool, so
              the record shows that something happened and leaves the rest to you.
            </Pair>
            <div className="relative flex flex-1 flex-col rounded-[26px] border border-white/15 bg-white/[0.04] p-6 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)] sm:p-8">
              <Character className="absolute -top-7 right-6 size-12" />
              <p className="font-mono text-[11px] tracking-[0.12em] text-white/50">WHAT THE CHAIN SEES</p>
              <p className="mt-3 text-[22px] font-semibold tracking-[-0.03em]">Nothing about your balance.</p>
              <ul className="mt-6 divide-y divide-white/10 border-y border-white/10">
                {rows.map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between py-3.5 text-[15px]">
                    <span className="text-white/65">{k}</span>
                    <span className="font-medium text-white/90">{v}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-auto flex flex-wrap justify-between gap-2 pt-5 font-mono text-[11px] text-white/45">
                <span>POOL {short(POOL_ADDRESS)}</span>
                <span>CHAIN {CHAIN_ID}</span>
              </p>
            </div>
          </div>
          <div data-scroll className="flex flex-col" style={rise}>
            <Pair title="You see exactly what goes public.">
              Adding money and cashing out are public. Everything between them is not. Slide through the steps.
            </Pair>
            <div className="flex-1">
              <VisibilitySlider />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ClaimLinks() {
  const steps: [string, string][] = [
    ["Link created", "40.00 USDG leaves your private balance"],
    ["Opened in another browser", "The secret travels in the link itself"],
    ["Claimed into a new account", "The money is theirs, privately"],
  ];
  return (
    <section id="claim" className="relative isolate overflow-hidden">
      <div className={`${WRAP} grid items-center gap-16 py-28 lg:grid-cols-[1fr_1.05fr]`}>
        <div data-scroll style={rise}>
          <Copy title="Pay someone who isn't here yet.">
            A claim link carries the money inside it. Send it any way you like; whoever opens it claims the payment into
            a new account in their own browser.
          </Copy>
        </div>
        <div data-scroll className="relative" style={rise}>
          <Character className="absolute -right-2 -bottom-12 size-14" />
          <div className="raised rounded-[26px] p-6 sm:p-7">
            <p className="text-ink-2 font-mono text-[11px] tracking-[0.12em]">A CLAIM LINK, EXAMPLE</p>
            <ol className="mt-5 space-y-4">
              {steps.map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="flex flex-col items-center">
                    <span className="bg-signal text-on-signal grid size-7 place-items-center rounded-full font-mono text-[11px] font-medium">
                      {i + 1}
                    </span>
                    {i < steps.length - 1 ? (
                      <span className="from-signal/60 to-line-strong mt-1 w-px flex-1 bg-gradient-to-b" />
                    ) : null}
                  </span>
                  <span className="pb-1">
                    <span className="block text-[17px] font-semibold tracking-[-0.02em]">{t}</span>
                    <span className="text-ink-2 block text-[14px]">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className="border-line relative isolate overflow-hidden border-t py-28 text-center sm:py-32">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(45%_55%_at_50%_100%,rgba(185,166,255,0.14)_0%,rgba(185,166,255,0)_70%)]"
      />
      <div className={WRAP}>
        <Character className="mx-auto size-16" />
        <h2 className="display-xl mx-auto mt-8 max-w-[14ch]">Private money, on your terms.</h2>
        <p className="text-ink-2 mx-auto mt-5 max-w-[34rem] text-[17px] leading-relaxed">
          Connect any EVM wallet, add test funds and get your account number. No sign-up and no email.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/app" className="btn btn-accent min-h-12 px-7 text-[16px]">
            Open mirk
          </Link>
          <Link href="/docs" className="btn btn-light min-h-12 px-6 text-[16px]">
            Read the docs
          </Link>
        </div>
        <p className="text-ink-2 mt-5 text-[12px]">{DISCLAIMER}</p>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="bg-canvas text-ink min-h-dvh [zoom:0.8]">
      <SiteHeader />
      <main className="-mt-[76px] sm:-mt-20">
        <Hero />
        <PayANumber />
        <Night />
        <ClaimLinks />
        <Closing />
      </main>
      <ScrollFX />
      <SiteFooter />
    </div>
  );
}
