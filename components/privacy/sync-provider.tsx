"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { userMessage } from "@/lib/gloam/errors";
import { checkInbox, ensureAccount, reconcile, registerAccount, syncAccountStatus } from "@/lib/gloam/services";
import { useServiceContext } from "@/lib/hooks/use-service";

interface SyncState {
  inboxStatus: "idle" | "checking" | "error";
  inboxError: string | null;
  lastChecked: number | null;
  registrationError: string | null;
  checkNow: () => Promise<{ found: number; swept: number } | null>;
  reconcileNow: () => Promise<void>;
  retryRegistration: () => Promise<void>;
}

const Ctx = createContext<SyncState | null>(null);

const INBOX_INTERVAL_MS = 60_000;

/**
 * Background upkeep while the store is open: make sure this device has an
 * account number registered, reconcile anything left in flight, and check for
 * incoming payments. All of it reads public chain data; nothing private leaves.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const ctx = useServiceContext();
  const [inboxStatus, setInboxStatus] = useState<SyncState["inboxStatus"]>("idle");
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const busy = useRef(false);
  const ctxRef = useRef(ctx);
  useLayoutEffect(() => {
    ctxRef.current = ctx;
  });

  const checkNow = useCallback(async () => {
    const c = ctxRef.current;
    if (!c || busy.current) return null;
    busy.current = true;
    setInboxStatus("checking");
    try {
      const r = await checkInbox(c);
      setInboxStatus("idle");
      setInboxError(null);
      setLastChecked(Date.now());
      return r;
    } catch (e) {
      setInboxStatus("error");
      setInboxError(userMessage(e));
      return null;
    } finally {
      busy.current = false;
    }
  }, []);

  const reconcileNow = useCallback(async () => {
    const c = ctxRef.current;
    if (!c) return;
    await reconcile(c);
  }, []);

  const retryRegistration = useCallback(async () => {
    const c = ctxRef.current;
    if (!c) return;
    setRegistrationError(null);
    try {
      await registerAccount(c.vault, c.client);
    } catch (e) {
      setRegistrationError(userMessage(e));
    }
  }, []);

  const vault = ctx?.vault;
  useEffect(() => {
    const c = ctxRef.current;
    if (!vault || !c) return;
    let stopped = false;
    (async () => {
      try {
        const acct = await ensureAccount(c.vault, c.client);
        const synced = await syncAccountStatus(c.vault, c.client);
        if (!stopped && (synced ?? acct.value).status === "unregistered") await retryRegistration();
      } catch (e) {
        if (!stopped) setRegistrationError(userMessage(e));
      }
      try {
        await reconcile(c);
      } catch {
        // Reconcile retries on the next pass.
      }
      if (!stopped) await checkNow();
    })();

    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const cur = ctxRef.current;
      if (!cur) return;
      await syncAccountStatus(cur.vault, cur.client).catch(() => null);
      await checkNow();
    }, INBOX_INTERVAL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [vault, checkNow, retryRegistration]);

  const value = useMemo(
    () => ({ inboxStatus, inboxError, lastChecked, registrationError, checkNow, reconcileNow, retryRegistration }),
    [inboxStatus, inboxError, lastChecked, registrationError, checkNow, reconcileNow, retryRegistration],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSync() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSync outside SyncProvider");
  return v;
}
