"use client";

import { useTheme } from "@/components/shared/theme";

/** Cycles light → dark → system. */
export function ThemeToggle() {
  const { pref, setPref } = useTheme();
  const next = pref === "light" ? "dark" : pref === "dark" ? "system" : "light";
  return (
    <button
      type="button"
      onClick={() => setPref(next)}
      aria-label={`Theme: ${pref}. Switch to ${next}.`}
      title={`Theme: ${pref}`}
      className="text-ink hover:bg-surface-2 grid size-10 place-items-center rounded-full"
    >
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 1.75a6.25 6.25 0 0 1 0 12.5Z" fill="currentColor" />
      </svg>
    </button>
  );
}
