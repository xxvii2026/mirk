"use client";

import { useMemo } from "react";
import type { PublicClient } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useVault } from "@/components/privacy/vault-provider";
import type { ServiceContext, SignerClient } from "@/lib/shielded/services";
import { CHAIN_ID } from "@/lib/robinhood/network";

/** Everything a service call needs, from wagmi and the unlocked store. */
export function useServiceContext(): Omit<ServiceContext, "onStep" | "allowWalletSubmit"> | null {
  const { vault } = useVault();
  const { chainId } = useAccount();
  const client = usePublicClient({ chainId: CHAIN_ID });
  const { data: wallet } = useWalletClient();
  return useMemo(() => {
    if (!vault || vault.isLocked || !client) return null;
    return {
      vault,
      client: client as PublicClient,
      wallet: (wallet as SignerClient | undefined) ?? null,
      walletChainId: chainId,
    };
  }, [vault, client, wallet, chainId]);
}
