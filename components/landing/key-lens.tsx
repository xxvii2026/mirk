"use client";

import { useEffect, useRef } from "react";

/** Example ledger: block heights are public, everything else needs the key. */
const ROWS = [
  ["4,218,903", "Sent to 6120 4471 0938", "−250.00"],
  ["4,218,911", "Received by claim link", "+40.00"],
  ["4,219,047", "Paid 4829 1630 7714", "−18.50"],
  ["4,219,102", "Received from 7709 8827 9921", "+600.00"],
  ["4,219,388", "Claim link created", "−40.00"],
  ["4,219,415", "Sent to 3302 1187 5560", "−72.25"],
] as const;

/** Deterministic hex noise, so server and client render the same ciphertext. */
function noise(seed: number, len: number) {
  let x = seed * 2654435761;
  let out = "";
  for (let i = 0; i < len; i++) {
    x = (x * 1103515245 + 12345) >>> 0;
    out += ((x >>> 16) & 15).toString(16);
  }
  return out;
}

const CIPHER = ROWS.map((_, i) => [
  `0x${noise(i + 1, 8)}…${noise(i + 11, 6)}`,
  `${noise(i + 21, 4)}·${noise(i + 31, 4)}`,
]);

const GRID = "grid grid-cols-[6.5rem_1fr_auto] items-center gap-4 px-5 py-3.5 sm:grid-cols-[8rem_1fr_auto] sm:px-7";

function Ledger({ plain }: { plain: boolean }) {
  return (
    <ul className="divide-y divide-white/[0.06]">
      {ROWS.map(([block, what, amount], i) => (
        <li key={block} className={GRID}>
          <span className="tabular font-mono text-[12px] text-white/40">#{block}</span>
          {plain ? (
            <span className="text-signal-text truncate text-[15px] font-medium">{what}</span>
          ) : (
            <span className="truncate font-mono text-[13px] text-white/25">{CIPHER[i]![0]}</span>
          )}
          {plain ? (
            <span className="tabular text-signal-text text-right text-[15px] font-semibold">{amount} USDG</span>
          ) : (
            <span className="text-right font-mono text-[13px] text-white/25">{CIPHER[i]![1]}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * The ledger as the chain keeps it, with a lens that reads it the way your key
 * does. Follows the pointer; drifts on its own when nobody is steering.
 * Position lives in CSS custom properties, so moving it never re-renders.
 */
export function KeyLens() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = (x: number, y: number) => {
      el.style.setProperty("--mx", `${(x * 100).toFixed(2)}%`);
      el.style.setProperty("--my", `${(y * 100).toFixed(2)}%`);
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let steering = false;
    let visible = false;
    let frame = 0;
    const t0 = performance.now();
    const drift = (now: number) => {
      frame = 0;
      if (steering || !visible) return;
      const t = (now - t0) / 1000;
      set(0.5 + Math.sin(t * 0.42) * 0.36, 0.5 + Math.sin(t * 0.73 + 1) * 0.34);
      frame = requestAnimationFrame(drift);
    };
    const start = () => {
      if (!frame) frame = requestAnimationFrame(drift);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      if (visible) start();
    });
    io.observe(el);

    // Percentages of the box, so the page's CSS zoom never skews the lens.
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      set((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    };
    const enter = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      steering = true;
      el.dataset.steering = "";
      move(e);
    };
    const steer = (e: PointerEvent) => {
      if (steering) move(e);
    };
    const leave = () => {
      steering = false;
      delete el.dataset.steering;
      start();
    };
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointermove", steer);
    el.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointermove", steer);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  const lens = "radial-gradient(circle var(--r) at var(--mx) var(--my), #000 78%, transparent 100%)";

  return (
    <div
      ref={ref}
      className="group relative isolate overflow-hidden rounded-[26px] border border-white/10 bg-[#0c0d0d] select-none [--mx:64%] [--my:42%] [--r:104px] sm:[--r:150px]"
    >
      <p className="sr-only">
        Example ledger. On chain each entry shows only its block number and unreadable data; with your key you see who
        and how much.
      </p>
      <div aria-hidden>
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3 font-mono text-[11px] tracking-[0.12em] text-white/40 sm:px-7">
          <span>POOL LEDGER · EXAMPLE VALUES</span>
          <span className="hidden sm:inline">MOVE TO READ</span>
        </div>
        <div className="relative">
          <Ledger plain={false} />
          <div className="absolute inset-0 bg-[#0c0d0d]" style={{ maskImage: lens, WebkitMaskImage: lens }}>
            <Ledger plain />
          </div>
          {/* The lens itself: a faint green rim and bloom where the key is reading. */}
          <span className="border-signal/40 group-data-[steering]:border-signal/70 pointer-events-none absolute top-[var(--my)] left-[var(--mx)] size-[calc(var(--r)*2)] -translate-x-1/2 -translate-y-1/2 rounded-full border shadow-[0_0_80px_-10px_var(--signal-glow),inset_0_0_60px_-20px_var(--signal-glow)] transition-[border-color] duration-300" />
          <span className="text-on-signal bg-signal pointer-events-none absolute top-[calc(var(--my)+var(--r)-18px)] left-[var(--mx)] -translate-x-1/2 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium tracking-[0.1em]">
            YOUR KEY
          </span>
        </div>
      </div>
    </div>
  );
}
