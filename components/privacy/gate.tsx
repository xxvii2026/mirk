"use client";

import { useAppKit } from "@reown/appkit/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { MarkTile } from "@/components/brand/wordmark";
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

/** Home can show its empty dashboard; private operations require a wallet and an unlocked store. */
export function PrivateGate({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { address, isConnected, chainId, status: accountStatus } = useAccount();
  const { status, unlock, error } = useVault();
  const attempted = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!isConnected) {
      attempted.current = undefined;
      return;
    }
    if (
      !POOL_CONFIGURED ||
      !REOWN_PROJECT_ID ||
      chainId !== CHAIN_ID ||
      status !== "locked" ||
      !address ||
      attempted.current === address
    )
      return;
    attempted.current = address;
    void unlock();
  }, [address, chainId, isConnected, status, unlock]);

  const connectionStatus =
    status !== "open" && isConnected ? (
      <div className="mb-5" role="status" aria-live="polite">
        {status === "unlocking" ? (
          <p className="text-muted text-sm">Confirm the connection in your wallet…</p>
        ) : status === "locked" ? (
          <Notice tone={error ? "danger" : "neutral"}>
            {error ?? "Your private store is locked."}{" "}
            <button
              type="button"
              className="min-h-11 font-medium underline underline-offset-4"
              onClick={() => void unlock()}
            >
              {error ? "Retry connection" : "Reconnect private store"}
            </button>
          </Notice>
        ) : null}
      </div>
    ) : null;

  if (path === "/app" && (!isConnected || (chainId === CHAIN_ID && status !== "unavailable")))
    return (
      <>
        {connectionStatus}
        {children}
      </>
    );

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
  if (status !== "open") return connectionStatus;
  return <>{children}</>;
}
