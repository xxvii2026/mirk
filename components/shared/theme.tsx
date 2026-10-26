"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ThemePref = "light" | "dark" | "system";

const KEY = "mirk.theme";

/** Runs before paint (inlined in <head>) so there is no flash of the wrong theme. */
export const THEME_BOOTSTRAP = `(function(){try{var p=localStorage.getItem("${KEY}")||"system";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){document.documentElement.dataset.theme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}})();`;

const listeners = new Set<() => void>();

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function apply(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (readPref() === "system") apply("system");
    fn();
  };
  mq.addEventListener("change", onChange);
  return () => {
    listeners.delete(fn);
    mq.removeEventListener("change", onChange);
  };
}

export function useTheme() {
  const pref = useSyncExternalStore(subscribe, readPref, () => "system" as ThemePref);
  const setPref = useCallback((p: ThemePref) => {
    try {
      localStorage.setItem(KEY, p);
    } catch {
      // Preference just won't persist.
    }
    apply(p);
    for (const fn of listeners) fn();
  }, []);
  return { pref, setPref };
}

const HIDE_KEY = "mirk.hideBalance";
const hideListeners = new Set<() => void>();

function readHidden() {
  try {
    return localStorage.getItem(HIDE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Per-device display preference: show or hide balances. Not financial data. */
export function useHideBalance() {
  const hidden = useSyncExternalStore(
    (fn) => {
      hideListeners.add(fn);
      return () => hideListeners.delete(fn);
    },
    readHidden,
    () => false,
  );
  const setHidden = useCallback((h: boolean) => {
    try {
      localStorage.setItem(HIDE_KEY, h ? "1" : "0");
    } catch {
      // ignore
    }
    for (const fn of hideListeners) fn();
  }, []);
  return { hidden, setHidden };
}
