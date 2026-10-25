"use client";

import { useEffect, useState } from "react";
import type { PublicClient } from "viem";
import { usePublicClient } from "wagmi";
import { checkAccountNumber, ACCOUNT_NUMBER_ERRORS } from "@/lib/account-number";
import { resolveAccount } from "@/lib/registry/client";
import { CHAIN_ID } from "@/lib/robinhood/network";

export type Resolution =
  | { state: "empty" }
  | { state: "invalid"; message: string }
  | { state: "checking" }
  | { state: "valid" }
  | { state: "unknown" }
  | { state: "error"; message: string };

/** Validate the checksum locally first, then look the number up in the on-chain registry. */
export function useResolveAccount(input: string): Resolution {
  const client = usePublicClient({ chainId: CHAIN_ID }) as PublicClient | undefined;
  const check = checkAccountNumber(input);
  const value = check.ok ? check.value : null;
  // The lookup result is keyed by the number it answers, so a stale answer never shows.
  const [res, setRes] = useState<{ for: string; result: Resolution } | null>(null);

  useEffect(() => {
    if (!value || !client) return;
    let alive = true;
    resolveAccount(client, value)
      .then((tag) => alive && setRes({ for: value, result: tag ? { state: "valid" } : { state: "unknown" } }))
      .catch(
        (e) =>
          alive &&
          setRes({
            for: value,
            result: { state: "error", message: e instanceof Error ? e.message : "Lookup failed." },
          }),
      );
    return () => {
      alive = false;
    };
  }, [value, client]);

  if (!check.ok) {
    if (check.reason === "empty") return { state: "empty" };
    // Do not nag while someone is still typing the 12 digits.
    if (check.reason === "length" && input.replace(/\D/g, "").length < 12 && !/[^\d\s-]/.test(input))
      return { state: "empty" };
    return { state: "invalid", message: ACCOUNT_NUMBER_ERRORS[check.reason] };
  }
  return res && res.for === check.value ? res.result : { state: "checking" };
}
