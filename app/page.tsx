import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { SiteFooter, SiteHeader, WRAP } from "@/components/brand/site-chrome";
import { Mark } from "@/components/brand/wordmark";
import { AppWindow } from "@/components/landing/app-window";
import { ScrollFX } from "@/components/landing/scroll-fx";
import { VisibilitySlider } from "@/components/landing/visibility-slider";
import { IconArrowRight, IconLink, IconReceive, IconWallet } from "@/components/shared/icons";
import { HiddenDots } from "@/components/shared/ui";
import { CHAIN_ID, POOL_ADDRESS } from "@/lib/robinhood/network";

const DISCLAIMER = "Testnet only. Test assets have no value. Not externally audited.";

function short(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** The mark as the page's character: floating, with a soft shadow on the sky. */
function Character({ className = "", light = false }: { className?: string; light?: boolean }) {
  return (
    <span aria-hidden className={`float inline-block ${className}`}>
      <Mark
        className={`size-full ${
          light
            ? "text-white drop-shadow-[0_0_24px_rgba(200,215,255,0.55)]"
            : "text-[#0b0b0c] drop-shadow-[0_22px_22px_rgba(40,60,110,0.35)]"
        }`}
      />
    </span>
  );
}

function Copy({ title, children, light }: { title: ReactNode; children: ReactNode; light?: boolean }) {
  return (
    <div>
      <h2 className="display-l max-w-[13ch]">{title}</h2>
      <p className={`mt-5 max-w-[30rem] text-[17px] leading-relaxed ${light ? "text-white/70" : "text-ink-2"}`}>
        {children}
      </p>
    </div>
  );
}

/** Entrance motion for a [data-scroll] block: rises into place. */
const rise: CSSProperties = {
  transform: "translateY(calc((1 - var(--e)) * 60px))",
  opacity: "calc(0.15 + var(--e) * 0.85)",
};

function Hero() {
  const chips: [typeof IconWallet, string, string][] = [
    [IconWallet, "Add money", "/app/add"],
    [IconReceive, "Get your account number", "/app/receive"],
    [IconLink, "Claim a link", "/claim"],
  ];
  return (
    <section data-scroll className="relative isolate overflow-hidden pt-[76px] pb-28 sm:pt-20">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[url(/sky/day.webp)] bg-cover bg-top" />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-64 bg-gradient-to-b from-transparent to-[#eff4fc]"
      />

      {/* The light trail: draws itself across the sky as you scroll. */}
      <svg
        aria-hidden
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 top-[38%] -z-10 h-[90%] w-full"
      >
        <path
          d="M -40 880 C 300 760, 520 260, 900 300 S 1380 620, 1500 140"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          style={{ strokeDashoffset: "max(0, 1 - var(--p) * 2.2)", filter: "drop-shadow(0 0 8px #fff)" }}
        />
      </svg>

      <div className={`${WRAP} pt-10 text-center sm:pt-14`}>
        <Character className="mx-auto size-[72px]" />
        <h1
          className="display-xl mx-auto mt-6 max-w-[15ch]"
          style={{ opacity: "calc(1 - var(--x) * 2.2)", transform: "translateY(calc(var(--x) * -80px))" }}
        >
          Private money for the open economy.
        </h1>
        <p className="text-ink-2 mx-auto mt-5 max-w-[36rem] text-[17px] leading-relaxed sm:text-[18px]">
          Hold, send and receive on a public chain without putting your balance or the amounts you move on the record.
          Your keys stay on your device.
        </p>

        <Link
          href="/app/send"
          className="glass mx-auto mt-8 flex min-h-14 w-full max-w-[560px] items-center justify-between gap-3 rounded-full py-1.5 pr-1.5 pl-6 text-left transition-transform duration-200 hover:scale-[1.01]"
        >
          <span className="text-ink-2 truncate text-[15px]">Pay a 12-digit MIRK account number…</span>
          <span className="btn btn-accent min-h-11 shrink-0 px-5 text-[14px]">
            Send privately <IconArrowRight className="size-4" />
          </span>
        </Link>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {chips.map(([Icon, label, href]) => (
            <Link
              key={href}
              href={href}
              className="glass text-ink-2 hover:text-ink inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 text-[13px] transition-colors"
            >
              <Icon className="size-4" /> {label}
            </Link>
          ))}
        </div>
        <p className="text-ink-2 mt-5 text-[12px]">{DISCLAIMER}</p>
      </div>

      <div data-scroll className="mx-auto mt-16 max-w-[1040px] px-4 sm:px-6">
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
    <section className="relative bg-[#eff4fc] pt-12 pb-40 sm:pb-52">
      <div className={`${WRAP} grid items-center gap-14 lg:grid-cols-[1fr_1.05fr]`}>
        <div data-scroll style={rise}>
          <Copy title="Pay a number, not an address.">
            Every MIRK account has a 12-digit number. It reveals no name, no wallet and no balance. Pay it like a bank
            account, or send a claim link to someone who has no account yet.
          </Copy>
          <Character className="mt-12 hidden size-20 lg:block" />
        </div>
        <div data-scroll className="relative mx-auto h-[360px] w-full max-w-[460px]">
          {cards.map((c, i) => (
            <div
              key={c.k}
              className="glass absolute inset-x-0 rounded-[22px] p-5"
              style={{
                top: `${i * 104}px`,
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
          <p className="text-ink-2 absolute -bottom-10 left-1 text-[12px]">Example values</p>
        </div>
      </div>
    </section>
  );
}

function Night() {
  const rows: [string, ReactNode][] = [
    ["Your balance", <HiddenDots key="b" />],
    ["Your last payment", <HiddenDots key="l" />],
    ["Who you paid", "Not on chain"],
  ];
  return (
    <section className="relative -mt-28 text-white">
      <div className="relative isolate overflow-hidden bg-[#0a1430] [clip-path:ellipse(150%_100%_at_50%_100%)] sm:[clip-path:ellipse(115%_100%_at_50%_100%)]">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[url(/sky/night.webp)] bg-cover bg-bottom" />

        <div className={`${WRAP} grid items-center gap-12 pt-44 pb-28 lg:grid-cols-[1fr_1.05fr]`}>
          <div data-scroll style={rise}>
            <Copy light title="Your balance keeps quiet.">
              On a public chain, every balance is a billboard. MIRK keeps your money in Gloam&apos;s shielded pool, so
              the record shows that something happened and leaves the rest to you.
            </Copy>
          </div>
          <div data-scroll className="relative" style={rise}>
            <Character light className="absolute -top-20 right-4 size-16 sm:-right-4" />
            <div className="rounded-[26px] border border-white/15 bg-[#0b1024]/60 p-6 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-8">
              <p className="font-mono text-[11px] tracking-[0.12em] text-white/50">WHAT THE CHAIN SEES</p>
              <p className="mt-3 text-[24px] font-semibold tracking-[-0.03em]">Nothing about your balance.</p>
              <ul className="mt-6 divide-y divide-white/10 border-y border-white/10">
                {rows.map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between py-3.5 text-[15px]">
                    <span className="text-white/65">{k}</span>
                    <span className="font-medium text-white/90">{v}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex flex-wrap justify-between gap-2 font-mono text-[11px] text-white/45">
                <span>POOL {short(POOL_ADDRESS)}</span>
                <span>CHAIN {CHAIN_ID}</span>
              </p>
            </div>
          </div>
        </div>

        <div className={`${WRAP} grid items-center gap-12 pt-16 pb-72 sm:pb-96 lg:grid-cols-[1fr_1.05fr]`}>
          <div data-scroll style={rise}>
            <Copy light title="You see exactly what goes public.">
              Adding money and cashing out are public. Everything between them is not. Slide through the steps.
            </Copy>
          </div>
          <div data-scroll style={rise}>
            <VisibilitySlider />
          </div>
        </div>
      </div>
    </section>
  );
}

function Sunset() {
  const steps: [string, string][] = [
    ["Link created", "40.00 USDG leaves your private balance"],
    ["Opened in another browser", "The secret travels in the link itself"],
    ["Claimed into a new account", "The money is theirs, privately"],
  ];
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[url(/sky/sunset.webp)] bg-cover bg-bottom" />
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-[#717ea7] to-transparent" />
      <div className={`${WRAP} grid items-center gap-12 pt-36 pb-64 sm:pb-80 lg:grid-cols-[1fr_1.05fr]`}>
        <div data-scroll style={rise}>
          <Copy title="Pay someone who isn't here yet.">
            A claim link carries the money inside it. Send it any way you like; whoever opens it claims the payment into
            a new account in their own browser.
          </Copy>
        </div>
        <div data-scroll className="relative" style={rise}>
          <Character className="absolute -right-2 -bottom-16 size-16" />
          <div className="glass rounded-[26px] p-6 sm:p-7">
            <p className="text-ink-2 font-mono text-[11px] tracking-[0.12em]">A CLAIM LINK, EXAMPLE</p>
            <ol className="mt-5 space-y-4">
              {steps.map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="flex flex-col items-center">
                    <span className="bg-ink text-on-ink grid size-7 place-items-center rounded-full font-mono text-[11px]">
                      {i + 1}
                    </span>
                    {i < steps.length - 1 ? <span className="bg-line-strong mt-1 w-px flex-1" /> : null}
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

function Lake() {
  return (
    <section data-scroll className="relative isolate overflow-hidden">
      <div className="bg-gradient-to-b from-[#9a8fc5] to-[#8f99ce] pt-24 pb-6 sm:pt-32">
        <div className={`${WRAP} text-center`}>
          <h2 className="display-xl mx-auto max-w-[14ch]">Private money, on your terms.</h2>
          <p className="mx-auto mt-5 max-w-[34rem] text-[17px] leading-relaxed text-[#2a2550]/75">
            Connect any EVM wallet, add test funds and get your account number. No sign-up and no email.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/app" className="btn btn-accent min-h-12 px-7 text-[16px]">
              Open MIRK
            </Link>
            <Link href="/docs" className="glass btn text-ink min-h-12 px-6 text-[16px]">
              How it works
            </Link>
          </div>
          <p className="mt-5 text-[12px] text-[#2a2550]/70">{DISCLAIMER}</p>
        </div>
      </div>

      {/* The scene keeps its own aspect, so the waterline sits at 60% of it. */}
      <div className="relative aspect-[8/5] min-h-[380px] w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/sky/lake.webp" alt="" className="absolute inset-0 size-full object-cover" />
        <div aria-hidden className="absolute top-[60%] left-1/2 w-20 -translate-x-1/2 sm:w-28">
          <div
            className="absolute inset-x-0 bottom-0"
            style={{ transform: "translateY(calc((1 - var(--e)) * -40px))" }}
          >
            <Mark className="size-full text-[#0b0b0c] drop-shadow-[0_10px_20px_rgba(42,37,80,0.35)]" />
          </div>
          <div className="absolute inset-x-0 top-1 opacity-30 blur-[1.5px] [mask-image:linear-gradient(180deg,#000,transparent_75%)]">
            <Mark className="size-full -scale-y-100 text-[#2a2550]" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="bg-canvas min-h-dvh">
      <SiteHeader />
      <main data-theme="light" className="text-ink -mt-[76px] sm:-mt-20">
        <Hero />
        <PayANumber />
        <Night />
        <Sunset />
        <Lake />
      </main>
      <ScrollFX />
      <SiteFooter />
    </div>
  );
}
