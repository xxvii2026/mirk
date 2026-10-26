"use client";

import { useAppKit } from "@reown/appkit/react";
import type { ReactNode } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { MarkTile } from "@/components/brand/wordmark";
import { Button, Notice, Pill, SignalDot } from "@/components/shared/ui";
import { REOWN_PROJECT_ID } from "@/lib/reown/config";
import { CHAIN_ID } from "@/lib/robinhood/network";
import { useVault } from "./vault-provider";

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="fade-in border-line-strong rounded-[22px] border border-dashed px-5 py-12 sm:py-16">
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 text-center">{children}</div>
    </div>
  );
}

function ConnectWallet() {
  const { open } = useAppKit();
  return (
    <Frame>
      <MarkTile className="size-14" />
      <div className="w-full space-y-2">
        <h1 className="text-[24px] font-semibold tracking-[-0.03em]">Connect a wallet to open mirk</h1>
        <p className="text-ink-2 text-[15px] leading-relaxed">
          Any EVM wallet works. mirk never holds your money: it sits in Gloam&apos;s shielded pool, and only keys on
          this device can move it.
        </p>
      </div>
      <Button className="w-full" onClick={() => open({ view: "Connect" })}>
        Connect wallet
      </Button>
      <p className="text-muted text-xs">Robinhood Chain testnet. Test assets have no value.</p>
    </Frame>
  );
}

function WrongNetwork({ actual }: { actual: number | undefined }) {
  const { switchChain, isPending, error } = useSwitchChain();
  return (
    <Frame>
      <Pill tone="danger">Wrong network</Pill>
      <div className="w-full space-y-2">
        <h1 className="text-[24px] font-semibold tracking-[-0.03em]">Switch to Robinhood Chain testnet</h1>
        <p className="text-ink-2 text-[15px] leading-relaxed">
          Your wallet is on network {actual ?? "unknown"}. mirk only works on Robinhood Chain testnet (chain {CHAIN_ID}
          ).
        </p>
      </div>
      <Button className="w-full" disabled={isPending} onClick={() => switchChain({ chainId: CHAIN_ID })}>
        {isPending ? "Check your wallet…" : "Switch network"}
      </Button>
      {error ? <Notice tone="danger">{error.message.split("\n")[0]}</Notice> : null}
    </Frame>
  );
}

function Unlock() {
  const { unlock, status, error } = useVault();
  return (
    <Frame>
      <Pill tone="signal">
        <SignalDot /> Private store
      </Pill>
      <div className="w-full space-y-2">
        <h1 className="text-[24px] font-semibold tracking-[-0.03em]">Unlock your private store</h1>
        <p className="text-ink-2 text-[15px] leading-relaxed">
          Your wallet will ask you to sign a message. The signature never leaves this device and does not authorize a
          transaction. It unlocks the encrypted keys that hold your private balance here.
        </p>
      </div>
      <Button className="w-full" disabled={status === "unlocking"} onClick={unlock}>
        {status === "unlocking" ? "Waiting for signature…" : "Unlock"}
      </Button>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <p className="text-muted text-xs">
        A signature is not a perfect recovery method. Export an encrypted backup from Settings once you hold money.
      </p>
    </Frame>
  );
}

/** Everything inside renders only with a connected wallet on the right chain and an unlocked store. */
export function PrivateGate({ children }: { children: ReactNode }) {
  const { isConnected, chainId, status: accountStatus } = useAccount();
  const { status } = useVault();

  if (!REOWN_PROJECT_ID) {
    return (
      <Frame>
        <Notice tone="danger" title="Wallet connection is not configured">
          This deployment is missing its Reown project ID.
        </Notice>
      </Frame>
    );
  }
  if (status === "checking" || accountStatus === "reconnecting" || accountStatus === "connecting") {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center" role="status" aria-live="polite">
        <span className="text-muted text-sm">Loading…</span>
      </div>
    );
  }
  if (status === "unavailable") {
    return (
      <Frame>
        <Notice tone="danger" title="Private storage is unavailable">
          This browser is blocking secure local storage (IndexedDB), often in private windows or with strict site-data
          settings. mirk needs it to keep your encrypted keys on this device. Try a regular window.
        </Notice>
      </Frame>
    );
  }
  if (!isConnected) return <ConnectWallet />;
  if (chainId !== CHAIN_ID) return <WrongNetwork actual={chainId} />;
  if (status !== "open") return <Unlock />;
  return <>{children}</>;
}
