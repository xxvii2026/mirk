"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { Mark } from "@/components/brand/wordmark";
import {
  IconArrowRight,
  IconArrowUpRight,
  IconLink,
  IconReceive,
  IconSend,
  IconWallet,
} from "@/components/shared/icons";
import { cx } from "@/components/shared/ui";

/**
 * The landing's tour of mirk as a bento: one example account, told tile by
 * tile. Every number is a labelled example, generated deterministically so the
 * server and client render the same thing. Animations start when the grid
 * scrolls into view, and timers run only while it is on screen.
 */

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const ACCOUNT = "7709 8827 9921";

/* ------------------------------------------------------------------ */
/*  Example account                                                    */
/* ------------------------------------------------------------------ */

function seeded(seed: number) {
  let h = seed;
  return () => {
    h = (h * 16807) % 2147483647;
    return h / 2147483647;
  };
}

/** Deposits (+) and cash-outs (−): the only amounts the public record ever learns. */
const PUBLIC_MOVES: [day: number, amount: number][] = [
  [3, 1500],
  [96, 800],
  [188, -600],
  [241, 1210],
  [318, -900],
];

const DAYS = 365;

/** One year, day by day: your balance, and the balance the public record could infer. */
const YEAR = (() => {
  const rnd = seeded(7);
  let pub = 0;
  let priv = 0;
  const balance: number[] = [];
  const record: number[] = [];
  const privateDays: boolean[] = [];
  for (let d = 0; d < DAYS; d++) {
    for (const [day, amount] of PUBLIC_MOVES) if (day === d) pub += amount;
    const moved = pub > 0 && rnd() < 0.38;
    if (moved) priv = Math.max(-pub + 60, priv + (rnd() - 0.47) * 140);
    balance.push(pub + priv);
    record.push(pub);
    privateDays.push(moved);
  }
  // Settle the example on the same 1,000.00 USDG the hero's app preview shows.
  const k = 1000 / balance[DAYS - 1]!;
  return { balance: balance.map((v) => v * k), record: record.map((v) => v * k), privateDays };
})();

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const usdg = (v: number) => `${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Whether the element is on screen; with `once`, latches true the first time it is. */
function useInView(ref: RefObject<Element | null>, once = false) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const on = !!entry?.isIntersecting;
        if (once && !on) return;
        setSeen(on);
        if (once && on) io.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, once]);
  return seen;
}

function useCountUp(target: number, run: boolean, reduced: boolean, duration = 1300) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run || reduced) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      setV(target * (1 - Math.pow(1 - p, 4)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, reduced, duration]);
  return run && reduced ? target : v;
}

function smooth(pts: ReadonlyArray<readonly [number, number]>) {
  return pts
    .map(([x, y], i) => {
      if (i === 0) return `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      const [px, py] = pts[i - 1]!;
      const m = (px + x) / 2;
      return `C ${m.toFixed(1)} ${py.toFixed(1)}, ${m.toFixed(1)} ${y.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

/** A step line: holds each value until the next, the way a ledger balance moves. */
function steps(pts: ReadonlyArray<readonly [number, number]>) {
  return pts
    .map(([x, y], i) => (i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `H ${x.toFixed(1)} V ${y.toFixed(1)}`))
    .join(" ");
}

type Live = { on: boolean; seen: boolean; reduced: boolean };

/* ------------------------------------------------------------------ */
/*  Shell                                                              */
/* ------------------------------------------------------------------ */

function Tile({
  title,
  action,
  className,
  style,
  children,
}: {
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <section
      className={cx(
        "border-line bg-surface relative flex min-w-0 flex-col overflow-hidden rounded-[26px] border p-5 shadow-[var(--highlight)]",
        className,
      )}
      style={style}
    >
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title && <h3 className="text-ink-2 text-[13px] font-medium">{title}</h3>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

function Pills<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="border-line inline-flex rounded-full border p-0.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={o === value}
          onClick={() => onChange(o)}
          className={cx(
            "rounded-full px-2.5 py-1 font-mono text-[11px] font-medium transition-colors",
            o === value ? "bg-ink text-on-ink" : "text-ink-2 hover:text-ink",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

const Tag = ({ children }: { children: ReactNode }) => (
  <span className="text-ink-2 font-mono text-[11px]">{children}</span>
);

/* ------------------------------------------------------------------ */
/*  Balance: greeting, private balance, 30-day flow strip              */
/* ------------------------------------------------------------------ */

function BalanceTile({ seen, reduced }: Live) {
  const value = YEAR.balance[DAYS - 1]!;
  const shown = useCountUp(value, seen, reduced);
  const month = YEAR.balance.slice(-31);
  const daily = month.slice(1).map((v, i) => v - month[i]!);
  const maxAbs = Math.max(...daily.map(Math.abs), 0.01);
  const change = value - month[0]!;
  const [hover, setHover] = useState<number | null>(null);
  const dayLabel = (i: number) => {
    const ago = daily.length - 1 - i;
    return ago === 0 ? "Today" : `${ago}d ago`;
  };

  return (
    <Tile className="sm:col-span-2 lg:col-span-2 lg:col-start-1 lg:row-start-1">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-[28px] leading-[1.1] font-semibold tracking-[-0.03em] sm:text-[32px]">
            gm, <span className="text-signal tabular">{ACCOUNT}</span>
          </p>
          <p className="text-ink-2 mt-1 text-sm">Your month, readable by you alone.</p>
        </div>
        <div className="sm:text-right">
          <p className="text-ink-2 text-[12px]">Private balance</p>
          <p className="tabular font-mono text-[34px] leading-none font-semibold tracking-[-0.04em] sm:text-[38px]">
            {usdg(shown)}
            <span className="text-ink-2 ml-1.5 text-[14px] tracking-normal">USDG</span>
          </p>
          <p className="tabular mt-1.5 font-mono text-[12px]">
            <span className={change >= 0 ? "text-signal-text" : "text-ink-2"}>
              {change >= 0 ? "+" : "−"}
              {usdg(Math.abs(change))}
            </span>
            <span className="text-ink-2"> · 30d</span>
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-1 flex-col">
        <div
          className="flex flex-1 items-end gap-[3px]"
          style={{ minHeight: 64 }}
          onPointerLeave={() => setHover(null)}
        >
          {daily.map((d, i) => {
            const h = d === 0 ? 6 : 18 + (Math.abs(d) / maxAbs) * 82;
            const up = d >= 0;
            return (
              <button
                key={i}
                type="button"
                onPointerEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`${dayLabel(i)}: ${d === 0 ? "no change" : `${up ? "+" : "−"}${usdg(Math.abs(d))} USDG`}`}
                className={cx("relative flex-1 rounded-[4px]", up ? "bg-signal" : "bg-tone-500")}
                style={{
                  height: seen ? `${h}%` : "6%",
                  opacity: hover === null ? 0.35 + (Math.abs(d) / maxAbs) * 0.65 : hover === i ? 1 : 0.25,
                  transition: reduced ? "none" : `height 900ms ${EASE} ${i * 18}ms, opacity 200ms ease`,
                }}
              />
            );
          })}
        </div>
        <div className="text-ink-2 mt-2 flex items-center justify-between font-mono text-[11px]">
          <span>30d ago</span>
          <span className="text-ink tabular" aria-live="polite">
            {hover !== null
              ? `${dayLabel(hover)} · ${daily[hover]! === 0 ? "no change" : `${daily[hover]! > 0 ? "+" : "−"}${usdg(Math.abs(daily[hover]!))}`}`
              : "Daily net flow · example"}
          </span>
          <span>Today</span>
        </div>
      </div>
    </Tile>
  );
}

/* ------------------------------------------------------------------ */
/*  Claim links: a fanned stack, click one to bring it forward         */
/* ------------------------------------------------------------------ */

type ClaimCard = { id: string; amount: string; note: string; color: string; color2: string; ink: string };

const CLAIM_CARDS: ClaimCard[] = [
  { id: "c3", amount: "0.05 ETH", note: "For Ada", color: "#4a3f78", color2: "#2a2346", ink: "#f5f4f4" },
  { id: "c2", amount: "250.00 USDG", note: "Rent split", color: "#8a78d6", color2: "#5a4aa6", ink: "#f5f4f4" },
  { id: "c1", amount: "40.00 USDG", note: "Dinner", color: "#d4c8ff", color2: "#a593f2", ink: "#160f2e" },
];

function CardFace({ c }: { c: ClaimCard }) {
  return (
    <>
      <span
        aria-hidden
        className="absolute inset-0 overflow-hidden rounded-[12px]"
        style={{
          backgroundImage: [
            "linear-gradient(180deg, rgba(255,255,255,0.28) 0%, transparent 34%)",
            `radial-gradient(110% 90% at 100% 0%, ${c.color2} 0%, transparent 60%)`,
            `linear-gradient(135deg, ${c.color} 0%, ${c.color2} 100%)`,
          ].join(", "),
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45), inset 0 0 0 1px rgba(255,255,255,0.14)",
        }}
      >
        {/* Holographic film, drifting on a CSS loop rather than per-frame state. */}
        <span className="glare absolute inset-0" />
      </span>
      <span className="relative flex items-center justify-between gap-3 px-4 pt-4">
        <span className="flex min-w-0 items-center gap-2.5">
          <Mark className="size-6" />
          <span className="truncate text-[13px] font-bold tracking-tight">Claim link</span>
        </span>
        <span className="tabular shrink-0 font-mono text-[12px] font-semibold">{c.amount}</span>
      </span>
      <span className="absolute right-4 bottom-3.5 text-[12px] font-medium opacity-75">{c.note}</span>
    </>
  );
}

function ClaimLinksTile({ seen, reduced }: Live) {
  const [order, setOrder] = useState(() => CLAIM_CARDS.map((c) => c.id));
  const PEEK = 42;
  const depth = order.length - 1;
  const front = CLAIM_CARDS.find((c) => c.id === order[order.length - 1])!;

  return (
    <Tile
      title={
        <span>
          Claim links <sup className="font-mono text-[10px]">{CLAIM_CARDS.length}</sup>
        </span>
      }
      className="lg:col-start-3 lg:row-start-1"
    >
      <div className="relative -mx-5 -mb-5 flex flex-1 flex-col justify-end overflow-hidden pt-1">
        <div className="relative">
          {order.map((id, pos) => {
            const c = CLAIM_CARDS.find((x) => x.id === id)!;
            const fromFront = order.length - 1 - pos;
            const isFront = fromFront === 0;
            return (
              <button
                key={id}
                type="button"
                onClick={() => !isFront && setOrder((o) => [...o.filter((x) => x !== id), id])}
                aria-label={`Claim link for ${c.amount}${isFront ? ", selected" : ", bring to front"}`}
                aria-pressed={isFront}
                className="absolute left-1/2 block w-[calc(100%-32px)] max-w-[300px] rounded-[12px] p-0 text-left"
                style={{
                  top: (depth - fromFront) * PEEK,
                  zIndex: pos + 1,
                  transform: `translateX(-50%) scale(${1 - fromFront * 0.055}) translateY(${seen ? 0 : 20}px)`,
                  transformOrigin: "top center",
                  opacity: seen ? 1 : 0,
                  color: c.ink,
                  boxShadow: "0 -10px 28px -14px rgba(0,0,0,0.75)",
                  transition: reduced
                    ? "none"
                    : `top 650ms cubic-bezier(0.34, 1.35, 0.64, 1), transform 650ms cubic-bezier(0.34, 1.35, 0.64, 1), opacity 500ms ease ${pos * 90}ms`,
                  cursor: isFront ? "default" : "pointer",
                }}
              >
                <span className="relative block w-full" style={{ paddingTop: "63.08%" }}>
                  <span className="absolute inset-0 block">
                    <CardFace c={c} />
                  </span>
                </span>
              </button>
            );
          })}
          <div
            aria-hidden
            className="invisible mx-auto w-[calc(100%-32px)] max-w-[300px] shrink-0"
            style={{ marginTop: depth * PEEK }}
          >
            <div style={{ paddingTop: "30%" }} />
          </div>
        </div>

        {/* The panel the stack tucks under. */}
        <div
          className="border-line relative z-10 flex h-[84px] shrink-0 items-end justify-between gap-3 border-t bg-[rgba(21,21,24,0.82)] px-5 pb-4 backdrop-blur-md"
          aria-live="polite"
        >
          <div className="min-w-0">
            <p className="truncate font-mono text-[13px] font-semibold">mirk…/claim#m1.••••••</p>
            <p className="text-ink-2 mt-1 truncate text-[11px]">{front.note}</p>
          </div>
          <p className="tabular shrink-0 font-mono text-[14px] font-semibold">{front.amount}</p>
        </div>
      </div>
    </Tile>
  );
}

/* ------------------------------------------------------------------ */
/*  Proof: a gauge that fills as the browser proves                    */
/* ------------------------------------------------------------------ */

const PROOFS = ["Send", "Claim", "Cash out"] as const;
type Proof = (typeof PROOFS)[number];

function ProofTile({ seen }: Live) {
  const [kind, setKind] = useState<Proof>("Send");
  const [run, setRun] = useState(0);
  const R = 62;
  const len = Math.PI * R;
  // Keyed by the choice, so picking one (or tapping the gauge) replays the fill.
  const play = seen ? `${EASE} 1.6s both` : "none";

  return (
    <Tile title="Proof" className="lg:col-start-4 lg:row-start-1" action={<Tag>in your browser</Tag>}>
      <button
        type="button"
        onClick={() => setRun((r) => r + 1)}
        aria-label="Replay the proof"
        className="flex flex-1 flex-col items-center justify-center rounded-2xl"
      >
        <svg key={`${kind}-${run}`} width="150" height="86" viewBox="0 0 150 86" aria-hidden>
          <path
            d="M 13 78 A 62 62 0 0 1 137 78"
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            stroke="var(--surface-3)"
          />
          <path
            d="M 13 78 A 62 62 0 0 1 137 78"
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={len}
            strokeDashoffset={len}
            stroke="var(--signal)"
            style={{ ["--len" as string]: `${len}px`, animation: seen ? `gauge-arc ${play}` : "none" }}
          />
          <g
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "75px 78px",
              animation: seen ? `gauge-needle ${play}` : "none",
            }}
          >
            <line x1="75" y1="78" x2="75" y2="30" strokeWidth="2.5" strokeLinecap="round" stroke="var(--ink)" />
          </g>
          <circle cx="75" cy="78" r="5" fill="var(--ink)" />
        </svg>
        <p className="mt-2 text-[17px] leading-tight font-semibold tracking-[-0.02em]">{kind} proof</p>
        <p className="text-ink-2 mt-1 text-center text-[12px]">Made on this device. Your keys never leave it.</p>
      </button>
      <div className="mt-4 flex justify-center">
        <Pills label="Proof for" value={kind} options={PROOFS} onChange={setKind} />
      </div>
    </Tile>
  );
}

/* ------------------------------------------------------------------ */
/*  Chart: your balance against what the public record can infer       */
/* ------------------------------------------------------------------ */

const RANGES = ["1W", "1M", "1Y"] as const;
type Range = (typeof RANGES)[number];

function ChartTile({ seen, reduced }: Live) {
  const uid = useId().replace(/:/g, "");
  const [range, setRange] = useState<Range>("1Y");
  const [hover, setHover] = useState<number | null>(null);
  const take = { "1W": 8, "1M": 31, "1Y": DAYS }[range];
  const step = range === "1Y" ? 4 : 1;
  const pick = (arr: number[]) => arr.slice(-take).filter((_, i, all) => i % step === 0 || i === all.length - 1);
  const a = pick(YEAR.balance);
  const b = pick(YEAR.record);
  const hidden = YEAR.privateDays.slice(-take).filter(Boolean).length;
  const W = 640;
  const H = 220;
  const lo = Math.min(0, ...a, ...b);
  const hi = Math.max(...a, ...b);
  const y = (v: number) => H - 16 - ((v - lo) / (hi - lo || 1)) * (H - 40);
  const pa = a.map((v, i) => [(i / (a.length - 1)) * W, y(v)] as const);
  const pb = b.map((v, i) => [(i / (b.length - 1)) * W, y(v)] as const);
  const la = smooth(pa);
  const lb = steps(pb);
  const idx = hover ?? a.length - 1;
  const left = `${(pa[idx]![0] / W) * 100}%`;
  const labels =
    range === "1Y"
      ? ["12m", "10m", "8m", "6m", "4m", "2m", "Now"]
      : range === "1M"
        ? ["4w", "3w", "2w", "1w", "Now"]
        : ["7d", "6d", "5d", "4d", "3d", "2d", "Now"];

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHover(Math.max(0, Math.min(a.length - 1, Math.round(((e.clientX - r.left) / r.width) * (a.length - 1)))));
  };

  return (
    <Tile
      title="Your balance vs the public record"
      className="sm:col-span-2 lg:col-span-2 lg:col-start-1 lg:row-span-2 lg:row-start-2"
      action={<Pills label="Chart range" value={range} options={RANGES} onChange={setRange} />}
    >
      <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
        <div>
          <p className="text-ink-2 flex items-center gap-2 text-[12px]">
            <span className="bg-signal h-[3px] w-4 rounded-full" aria-hidden />
            What you see
          </p>
          <p className="tabular mt-1 font-mono text-[22px] font-semibold">{usdg(a[idx]!)}</p>
        </div>
        <div>
          <p className="text-ink-2 flex items-center gap-2 text-[12px]">
            <span className="border-ink-2 h-0 w-4 border-t-2 border-dashed" aria-hidden />
            What the record can infer
          </p>
          <p className="tabular text-ink-2 mt-1 font-mono text-[22px] font-semibold">{usdg(b[idx]!)}</p>
        </div>
        <span className="bg-signal-tint text-signal-text tabular ml-auto rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold">
          {hidden} private days
        </span>
      </div>

      <div
        className="relative mt-4 flex-1 touch-pan-y"
        style={{ minHeight: 220 }}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Example: your balance ${usdg(a[a.length - 1]!)} USDG, while the public record only reflects deposits and cash-outs, ${usdg(b[b.length - 1]!)} USDG, over ${range}`}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <linearGradient id={`${uid}-f`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--signal)" stopOpacity={0.26} />
              <stop offset="1" stopColor="var(--signal)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={0}
              x2={W}
              y1={H * f}
              y2={H * f}
              vectorEffect="non-scaling-stroke"
              strokeDasharray="1 5"
              stroke="var(--line-strong)"
            />
          ))}
          <path
            d={`${la} L ${W} ${H} L 0 ${H} Z`}
            fill={`url(#${uid}-f)`}
            style={{ opacity: seen ? 1 : 0, transition: "opacity 900ms ease 400ms" }}
          />
          <path
            d={lb}
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="4 5"
            vectorEffect="non-scaling-stroke"
            stroke="var(--ink-2)"
          />
          <path
            key={range}
            d={la}
            fill="none"
            strokeWidth={2.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            stroke="var(--signal)"
            style={{
              strokeDasharray: 1,
              strokeDashoffset: seen || reduced ? 0 : 1,
              transition: reduced ? "none" : `stroke-dashoffset 1300ms ${EASE}`,
            }}
          />
        </svg>
        <span
          aria-hidden
          className="bg-line-strong pointer-events-none absolute inset-y-0 w-px -translate-x-1/2"
          style={{ left, opacity: hover !== null ? 1 : 0 }}
        />
        <span
          aria-hidden
          className="border-surface bg-signal pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px]"
          style={{ left, top: `${(pa[idx]![1] / H) * 100}%` }}
        />
        <span
          aria-hidden
          className="border-surface bg-ink-2 pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
          style={{ left, top: `${(pb[idx]![1] / H) * 100}%`, opacity: hover !== null ? 1 : 0 }}
        />
      </div>
      <div className="text-ink-2 mt-3 flex justify-between font-mono text-[11px]" aria-hidden>
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <p className="text-ink-2 mt-3 text-[12px]">
        The dashed line only moves when you add money or cash out. Everything between is yours. Example values.
      </p>
    </Tile>
  );
}

/* ------------------------------------------------------------------ */
/*  Moves: how many of this month's moves went public                  */
/* ------------------------------------------------------------------ */

const MOVES = [
  { label: "Sent privately", n: 11, public: false },
  { label: "Claim links", n: 4, public: false },
  { label: "Added money", n: 1, public: true },
  { label: "Cashed out", n: 1, public: true },
] as const;

function MovesTile({ seen, reduced }: Live) {
  const total = MOVES.reduce((s, m) => s + m.n, 0);
  const shown = MOVES.filter((m) => m.public).reduce((s, m) => s + m.n, 0);
  const colors = ["var(--signal)", "#8a78d6", "var(--tone-500)", "var(--tone-600)"];
  const [hover, setHover] = useState<number | null>(null);

  return (
    <Tile title="This month's moves" className="lg:col-start-3 lg:row-start-2">
      <p className="tabular font-mono text-[22px] font-semibold">
        {shown} <span className="text-ink-2 text-[14px]">of {total} public</span>
      </p>
      <div className="mt-4 flex h-9 gap-1" onPointerLeave={() => setHover(null)}>
        {MOVES.map((m, i) => (
          <span
            key={m.label}
            onPointerEnter={() => setHover(i)}
            className={cx("rounded-[8px]", m.public && "hatch")}
            style={{
              flexBasis: seen ? `${(m.n / total) * 100}%` : `${100 / MOVES.length}%`,
              background: m.public ? undefined : colors[i],
              opacity: hover === null || hover === i ? 1 : 0.3,
              transition: reduced ? "none" : `flex-basis 1000ms ${EASE} ${200 + i * 60}ms, opacity 200ms ease`,
            }}
            aria-hidden
          />
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {MOVES.map((m, i) => (
          <li
            key={m.label}
            className="flex items-center justify-between gap-2 text-[12px]"
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={cx("size-2 shrink-0 rounded-full", m.public && "hatch")}
                style={{ background: m.public ? undefined : colors[i] }}
                aria-hidden
              />
              <span className="truncate">{m.label}</span>
            </span>
            <span className="tabular text-ink-2 font-mono">{m.n}</span>
          </li>
        ))}
      </ul>
    </Tile>
  );
}

/* ------------------------------------------------------------------ */
/*  Account number: the solid lavender tile                            */
/* ------------------------------------------------------------------ */

function AccountTile() {
  const groups = ACCOUNT.split(" ");
  return (
    <section className="bg-signal text-on-signal relative flex min-w-0 flex-col overflow-hidden rounded-[26px] p-5 lg:col-start-4 lg:row-span-2 lg:row-start-2">
      <header className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold opacity-75">Your account number</h3>
        <span className="flex items-center gap-1.5 rounded-full bg-[rgba(22,15,46,0.1)] px-2 py-0.5 font-mono text-[11px] font-semibold">
          <span className="bg-on-signal size-1.5 rounded-full" aria-hidden />
          Example
        </span>
      </header>

      <p className="tabular mt-5 font-mono text-[44px] leading-[0.95] font-semibold tracking-[-0.04em]">
        {groups.map((g) => (
          <span key={g} className="block">
            {g}
          </span>
        ))}
      </p>
      <p className="mt-3 text-[13px] font-medium opacity-75">Share it like a bank account. Get paid privately.</p>

      <div className="mt-5 rounded-2xl bg-[rgba(22,15,46,0.08)] p-3">
        <p className="text-[12px] font-semibold opacity-70">What it reveals</p>
        <dl className="mt-2 space-y-1.5 text-[12px]">
          {["Your name", "Your wallet", "Your balance"].map((k) => (
            <div key={k} className="flex justify-between">
              <dt className="opacity-75">{k}</dt>
              <dd className="font-mono font-semibold">nothing</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="mt-3 text-[12px] opacity-70">
        Eleven random digits and a check digit, so a typo is caught before you send.
      </p>

      <div className="mt-auto pt-6">
        <Link
          href="/app"
          className="bg-on-signal text-signal flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-opacity hover:opacity-90"
        >
          Get your number <IconArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pool                                                               */
/* ------------------------------------------------------------------ */

function PoolTile({ pool, chainId, explorer }: { pool: string; chainId: number; explorer: string }) {
  return (
    <Tile title="Where the money sits" className="lg:col-start-3 lg:row-start-3" action={<Tag>testnet</Tag>}>
      <p className="text-[17px] leading-tight font-semibold tracking-[-0.02em]">Gloam&apos;s shielded pool</p>
      <p className="text-ink-2 tabular mt-1 font-mono text-[12px]">
        {pool.slice(0, 6)}…{pool.slice(-4)} · chain {chainId}
      </p>
      <div className="hatch mt-5 h-10 rounded-[10px] opacity-80" aria-hidden />
      <p className="text-ink-2 mt-3 text-[12px]">mirk never holds it. Only keys on your device can move it.</p>
      <a
        href={`${explorer}/address/${pool}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-ink hover:text-signal-text mt-auto inline-flex items-center gap-1 pt-4 text-[13px] font-medium transition-colors"
      >
        View the contract <IconArrowUpRight className="size-3.5" />
      </a>
    </Tile>
  );
}

/* ------------------------------------------------------------------ */
/*  The public record, block by block                                  */
/* ------------------------------------------------------------------ */

type Block = { n: number; fill: number; hidden: boolean };

function makeBlock(n: number, r: () => number): Block {
  const fill = 0.3 + r() * 0.7;
  return { n, fill, hidden: r() < 0.3 };
}

function BlocksTile({ on, reduced }: Live) {
  const [blocks, setBlocks] = useState<Block[]>(() => {
    const r = seeded(11);
    return Array.from({ length: 42 }, (_, i) => makeBlock(1_000_000 + i, r));
  });
  const rnd = useMemo(() => seeded(29), []);
  useEffect(() => {
    if (!on || reduced) return;
    const id = window.setInterval(
      () => setBlocks((b) => [...b.slice(1), makeBlock(b[b.length - 1]!.n + 1, rnd)]),
      2400,
    );
    return () => window.clearInterval(id);
  }, [on, reduced, rnd]);
  const withTransfer = blocks.filter((b) => b.hidden).length;

  return (
    <Tile
      title="The public record"
      className="sm:col-span-2 lg:col-span-2 lg:col-start-1 lg:row-start-4"
      action={<Tag>illustrative</Tag>}
    >
      <p className="text-ink-2 text-[13px]">
        Each lavender block carries a private transfer. The record shows it happened; nothing more.
      </p>
      <div className="mt-4 flex flex-1 items-end gap-[3px]" style={{ minHeight: 64 }} aria-hidden>
        {blocks.map((b, i) => {
          const isLast = i === blocks.length - 1;
          return (
            <span
              key={b.n}
              className={cx("flex-1 rounded-[3px]", b.hidden ? "bg-signal" : "bg-tone-500")}
              style={{
                height: `${b.fill * 100}%`,
                opacity: b.hidden ? 0.55 + (i / blocks.length) * 0.45 : 0.15 + (i / blocks.length) * 0.35,
                animation: isLast && !reduced ? "block-pop 500ms cubic-bezier(.3,1.5,.6,1)" : undefined,
                transformOrigin: "bottom",
              }}
            />
          );
        })}
      </div>
      <dl className="border-line mt-4 grid grid-cols-3 gap-3 border-t pt-3">
        {[
          ["Blocks shown", String(blocks.length)],
          ["With a transfer", String(withTransfer)],
          ["Amounts readable", "0"],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-ink-2 text-[11px]">{k}</dt>
            <dd className="tabular mt-0.5 font-mono text-[13px] font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </Tile>
  );
}

/* ------------------------------------------------------------------ */
/*  Activity                                                           */
/* ------------------------------------------------------------------ */

const ACTIVITY = [
  {
    icon: IconSend,
    title: "Sent to 6120 4471 0938",
    detail: "Private transfer · 12m",
    amount: "−250.00",
    status: "confirmed",
  },
  { icon: IconLink, title: "Claim link created", detail: "Private transfer · 2h", amount: "−40.00", status: "claimed" },
  {
    icon: IconReceive,
    title: "Received from 4829 1630 7714",
    detail: "Private transfer · 1d",
    amount: "+600.00",
    status: "confirmed",
  },
  {
    icon: IconWallet,
    title: "Added from your wallet",
    detail: "Public deposit · 3d",
    amount: "+1,210.00",
    status: "public",
  },
] as const;

function ActivityTile({ seen, reduced }: Live) {
  return (
    <Tile
      title="Activity"
      className="sm:col-span-2 lg:col-span-2 lg:col-start-3 lg:row-start-4"
      action={<Tag>USDG · example</Tag>}
    >
      <ul className="-mx-2 -my-1">
        {ACTIVITY.map((a, i) => (
          <li
            key={a.title}
            className="hover:bg-surface-2 flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors"
            style={{
              opacity: seen ? 1 : 0,
              transform: seen ? "none" : "translateY(6px)",
              transition: reduced
                ? "none"
                : `opacity 500ms ease ${300 + i * 70}ms, transform 500ms ${EASE} ${300 + i * 70}ms, background-color 150ms ease`,
            }}
          >
            <span className="bg-surface-3 text-ink grid size-9 shrink-0 place-items-center rounded-xl">
              <a.icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{a.title}</p>
              <p className="text-ink-2 truncate text-[11px]">{a.detail}</p>
            </div>
            <div className="text-right">
              <p className="tabular font-mono text-[13px] font-medium">{a.amount}</p>
              <p
                className={cx(
                  "mt-0.5 font-mono text-[10px] font-semibold",
                  a.status === "public" ? "text-ink-2" : "text-signal-text",
                )}
              >
                {a.status}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Tile>
  );
}

/* ------------------------------------------------------------------ */
/*  Bento                                                              */
/* ------------------------------------------------------------------ */

export interface Web3BentoProps {
  pool: string;
  chainId: number;
  explorer: string;
  className?: string;
}

export function Web3Bento({ pool, chainId, explorer, className }: Web3BentoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const seen = useInView(ref, true);
  const on = useInView(ref);
  const live: Live = { on, seen, reduced };

  return (
    <div ref={ref} className={cx("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
      <BalanceTile {...live} />
      <ClaimLinksTile {...live} />
      <ProofTile {...live} />
      <ChartTile {...live} />
      <MovesTile {...live} />
      <AccountTile />
      <PoolTile pool={pool} chainId={chainId} explorer={explorer} />
      <BlocksTile {...live} />
      <ActivityTile {...live} />
    </div>
  );
}

export default Web3Bento;
