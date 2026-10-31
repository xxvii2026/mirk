"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useAccount, useSignMessage } from "wagmi";
import { UNLOCK_MESSAGE, WrongKeyError } from "@/lib/crypto-store/crypto";
import { storageAvailable } from "@/lib/crypto-store/db";
import type { RecordKind } from "@/lib/crypto-store/records";
import { unlockStore, type PrivateVault } from "@/lib/crypto-store/vault";
import { isUserRejection } from "@/lib/shielded/errors";

type Status = "checking" | "unavailable" | "locked" | "unlocking" | "open";

interface VaultState {
  status: Status;
  vault: PrivateVault | null;
  error: string | null;
  unlock: () => Promise<void>;
  lock: () => void;
}

const Ctx = createContext<VaultState | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [status, setStatus] = useState<Status>("checking");
  const [vault, setVault] = useState<PrivateVault | null>(null);
  const [error, setError] = useState<string | null>(null);
  const owner = useRef<string | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    storageAvailable().then(
      (ok) => alive && setStatus((s) => (s === "checking" ? (ok ? "locked" : "unavailable") : s)),
    );
    return () => {
      alive = false;
    };
  }, []);

  // A different (or no) wallet must never see the previous wallet's store.
  useEffect(() => {
    if (owner.current && owner.current !== address) {
      vault?.lock();
      setVault(null);
      setStatus((s) => (s === "unavailable" ? s : "locked"));
    }
    owner.current = address;
  }, [address, vault]);

  const unlock = useCallback(async () => {
    if (!address) return;
    setError(null);
    setStatus("unlocking");
    try {
      // The signature is used only here, locally, and then dropped.
      const signature = await signMessageAsync({ message: UNLOCK_MESSAGE });
      if (owner.current !== address) return;
      const { vault: v } = await unlockStore(address, signature);
      if (owner.current !== address) {
        v.lock();
        return;
      }
      setVault(v);
      setStatus("open");
    } catch (e) {
      if (owner.current !== address) return;
      setStatus("locked");
      if (isUserRejection(e)) setError("You cancelled the signature. Your private store stays locked.");
      else if (e instanceof WrongKeyError)
        setError(
          "This signature did not open the private store on this device. Some wallets sign differently each time; if so, restore from an encrypted backup in Settings after unlocking a new store.",
        );
      else setError(e instanceof Error ? e.message : "Could not unlock the private store.");
    }
  }, [address, signMessageAsync]);

  const lock = useCallback(() => {
    vault?.lock();
    setVault(null);
    setStatus("locked");
  }, [vault]);

  const value = useMemo(() => ({ status, vault, error, unlock, lock }), [status, vault, error, unlock, lock]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useVault() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useVault outside VaultProvider");
  return v;
}

export function useOpenVault(): PrivateVault {
  const { vault } = useVault();
  if (!vault) throw new Error("Private store is locked");
  return vault;
}

const noop = () => () => {};

/** Re-render when the vault changes; returns decrypted records of one kind. */
export function useRecords<K extends RecordKind>(kind: K) {
  const { vault } = useVault();
  useSyncExternalStore(vault?.subscribe ?? noop, vault?.getVersion ?? (() => 0), () => 0);
  return vault && !vault.isLocked ? vault.list(kind) : [];
}
