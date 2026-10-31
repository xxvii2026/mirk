"use client";

import { useAppKit } from "@reown/appkit/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { MarkTile } from "@/components/brand/wordmark";
import { IconLock } from "@/components/shared/icons";
import { Button, Notice, Pill } from "@/components/shared/ui";
import { REOWN_PROJECT_ID } from "@/lib/reown/config";
import { CHAIN_ID, POOL_CONFIGURED } from "@/lib/robinhood/network";
import { useVault } from "./vault-provider";

/** A single card, left-aligned like Gloam's welcome sheet. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="fade-in flex min-h-[60dvh] items-center justify-center py-6">
      <div className="border-line bg-surface flex w-full max-w-[440px] flex-col items-start gap-5 rounded-[20px] border p-6 sm:p-7">
        {children}
      </div>
    </div>
  );
}

/** A quiet aside with a lock, for what lives on this device. */
function DeviceNote({ children }: { children: ReactNode }) {
  return (
    <p className="bg-surface-2 text-ink-2 flex w-full gap-3 rounded-[14px] px-4 py-3 text-[13px] leading-relaxed">
      <IconLock className="text-signal-text mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

const TITLE = "text-[28px] leading-[1.1] font-light tracking-[-0.02em]";

function ConnectWallet() {
  const { open } = useAppKit();
  return (
    <Frame>
      <MarkTile className="size-10" />
      <div className="w-full space-y-2">
        <h1 className={TITLE}>Connect a wallet to open Mirk</h1>
        <p className="text-ink-2 text-[15px] leading-relaxed">
          Any EVM wallet works. Mirk never holds your money: it sits in Mirk&apos;s shielded pool, and only keys on this
          device can move it.
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
        <h1 className={TITLE}>Switch to Robinhood Chain testnet</h1>
        <p className="text-ink-2 text-[15px] leading-relaxed">
          Your wallet is on network {actual ?? "unknown"}. Mirk only works on Robinhood Chain testnet (chain {CHAIN_ID}
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
      <MarkTile className="size-10" />
      <div className="w-full space-y-2">
        <h1 className={TITLE}>Open your private balance</h1>
        <p className="text-ink-2 text-[15px] leading-relaxed">
          Your private balance lives in this browser, encrypted. Sign a message with your wallet to open it. Signing is
          free, moves no money and never leaves this device.
        </p>
      </div>
      <DeviceNote>
        The signature is the key to your data here. Save a backup in Settings once you hold money, in case this browser
        is cleared.
      </DeviceNote>
      <Button className="w-full" disabled={status === "unlocking"} onClick={unlock}>
        {status === "unlocking" ? "Check your wallet…" : "Sign to open"}
      </Button>
      {error ? <Notice tone="danger">{error}</Notice> : null}
    </Frame>
  );
}

/** Home can show its empty dashboard; private operations require a wallet and an unlocked store. */
export function PrivateGate({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { isConnected, chainId, status: accountStatus } = useAccount();
  const { status } = useVault();

  if (path === "/app" && !isConnected) return <>{children}</>;

  if (!POOL_CONFIGURED)
    return (
      <Frame>
        <MarkTile className="size-10" />
        <h1 className={TITLE}>Mirk is getting its own pool.</h1>
        <p className="text-ink-2 text-[15px] leading-relaxed">
          Payments will open once Mirk&apos;s testnet pool is deployed and verified. Existing funds stay in the previous
          pool.
        </p>
      </Frame>
    );
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
          settings. Mirk needs it to keep your encrypted keys on this device. Try a regular window.
        </Notice>
      </Frame>
    );
  }
  if (!isConnected) return <ConnectWallet />;
  if (chainId !== CHAIN_ID) return <WrongNetwork actual={chainId} />;
  if (status !== "open") return <Unlock />;
  return <>{children}</>;
}
