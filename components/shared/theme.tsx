"use client";

import { useCallback, useSyncExternalStore } from "react";

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
