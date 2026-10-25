"use client";

import { useEffect } from "react";

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Drives the landing's scroll story. Every `[data-scroll]` element gets three
 * custom properties, updated once per frame while scrolling:
 *   --e  0 → 1 as the element's top travels from the bottom of the viewport
 *        to just past the middle (its entrance)
 *   --p  0 → 1 across the element's whole pass through the viewport
 *   --x  0 → 1 as the element leaves: from its top at the viewport top until
 *        its bottom gets there (its exit)
 * CSS does the rest. With reduced motion, nothing moves: --e stays 1.
 */
export function ScrollFX() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-scroll]"));
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) continue;
        el.style.setProperty("--e", clamp((vh - r.top) / (vh * 0.45)).toFixed(4));
        el.style.setProperty("--p", clamp((vh - r.top) / (vh + r.height)).toFixed(4));
        el.style.setProperty("--x", clamp(-r.top / r.height).toFixed(4));
      }
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
    };
  }, []);
  return null;
}
