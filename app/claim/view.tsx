"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { PublicClient } from "viem";
import { usePublicClient } from "wagmi";
import { Wordmark } from "@/components/brand/wordmark";
import { Amount } from "@/components/money/amount";
import { FlowErrorNotice, FlowProgress, useFlow, type StepDef } from "@/components/money/flow";
import { PrivateGate } from "@/components/privacy/gate";
import { Providers } from "@/components/shared/providers";
import { ButtonLink, Button, Card, Notice, Pill } from "@/components/shared/ui";
import { CLAIM_ERRORS, decodeClaimPackage, type ClaimPayload } from "@/lib/gloam/claim-package";
import { userMessage } from "@/lib/gloam/errors";
import { claimFromLink, ensureAccount, previewClaim, type ServiceContext } from "@/lib/gloam/services";
import { CHAIN_ID, assetByAddress } from "@/lib/robinhood/network";

const STEPS: StepDef[] = [
  { key: ["preparing", "syncing"], label: "Finding the payment" },
  { key: "proving", label: "Generating proof on your device" },
  { key: ["submitting", "wallet"], label: "Moving it into a note only you know" },
  { key: "confirming", label: "Confirming on Robinhood Chain" },
  { key: "done", label: "In your private balance" },
];

type Parsed = { state: "reading" } | { state: "invalid"; message: string } | { state: "ok"; payload: ClaimPayload };

function Preview({ payload }: { payload: ClaimPayload }) {
  const client = usePublicClient({ chainId: CHAIN_ID }) as PublicClient | undefined;
  const [state, setState] = useState<{
    loading: boolean;
    items: { asset: string; amountWei: bigint }[];
    error: string | null;
  }>({
    loading: true,
    items: [],
    error: null,
  });
  useEffect(() => {
    if (!client) return;
    let alive = true;
    previewClaim(client, payload)
      .then((items) => alive && setState({ loading: false, items, error: null }))
      .catch((e) => alive && setState({ loading: false, items: [], error: userMessage(e) }));
    return () => {
      alive = false;
    };
  }, [client, payload]);

  if (state.loading)
    return (
      <p className="text-muted text-sm" role="status">
        Looking for the payment on Robinhood Chain…
      </p>
    );
  if (state.error) return <Notice tone="danger">{state.error}</Notice>;
  if (!state.items.length)
    return (
      <Notice title="No unclaimed payment found">
        It may already have been claimed, or the sender&apos;s payment is still confirming. Try again in a minute.
      </Notice>
    );
  return (
    <div className="space-y-1">
      <p className="text-muted text-sm">Waiting to be claimed</p>
      {state.items.map((i) => {
        const a = assetByAddress(i.asset);
        return a ? (
          <p key={i.asset} className="text-[36px]">
            <Amount value={i.amountWei} decimals={a.decimals} symbol={a.symbol} />
          </p>
        ) : null;
      })}
    </div>
  );
}

function ClaimAction({ payload }: { payload: ClaimPayload }) {
  const action = useCallback(
    async (ctx: ServiceContext) => {
      await ensureAccount(ctx.vault, ctx.client);
      return claimFromLink(ctx, payload);
    },
    [payload],
  );
  const flow = useFlow(action);

  if (flow.phase === "done" && flow.result) {
    const r = flow.result;
    if (r.status === "claimed") {
      const a = assetByAddress(r.asset);
      return (
        <div className="space-y-4">
          <Pill tone="signal">Claimed</Pill>
          {a ? (
            <p className="text-[36px]">
              <Amount value={r.amountWei} decimals={a.decimals} symbol={a.symbol} />
            </p>
          ) : null}
          <p className="text-muted text-[15px]">Confirmed on chain and now in your private balance.</p>
          <ButtonLink href="/app">Open MIRK</ButtonLink>
        </div>
      );
    }
    const text =
      r.status === "taken"
        ? "This payment was claimed by someone else, or taken back by the sender, before your claim landed."
        : r.status === "pending"
          ? "Your claim was submitted but is not confirmed yet. Open MIRK in a moment; it will finish automatically."
          : "No unclaimed payment was found for this link. It may have been claimed already, or is still confirming.";
    return (
      <div className="space-y-3">
        <Notice tone={r.status === "taken" ? "danger" : "neutral"}>{text}</Notice>
        <Button variant="ghost" onClick={() => flow.run()}>
          Check again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {flow.phase === "running" ? (
        <FlowProgress steps={STEPS} current={flow.step} part={flow.part} />
      ) : (
        <Button className="w-full" onClick={() => flow.run()}>
          Claim into my MIRK account
        </Button>
      )}
      <FlowErrorNotice flow={flow} onRetry={() => flow.run()} />
    </div>
  );
}

export function ClaimView() {
  const [parsed, setParsed] = useState<Parsed>({ state: "reading" });

  useEffect(() => {
    const hash = window.location.hash;
    // Take the secret out of the visible URL and history straight away.
    if (hash) window.history.replaceState(null, "", window.location.pathname);
    decodeClaimPackage(hash).then((r) => {
      if (!r.ok) setParsed({ state: "invalid", message: CLAIM_ERRORS[r.reason] });
      else if (r.payload.n !== CHAIN_ID)
        setParsed({ state: "invalid", message: "This claim link is for a different network." });
      else setParsed({ state: "ok", payload: r.payload });
    });
  }, []);

  return (
    <Providers>
      <div className="min-h-dvh">
        <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/" aria-label="MIRK home" className="flex min-h-11 items-center">
            <Wordmark className="text-[22px]" />
          </Link>
          <Pill>Testnet</Pill>
        </header>
        <main className="mx-auto max-w-md space-y-6 px-4 pt-6 pb-16">
          <h1 className="text-[28px] font-semibold tracking-tight">Claim a private payment</h1>
          {parsed.state === "reading" ? (
            <p className="text-muted" role="status">
              Reading link…
            </p>
          ) : null}
          {parsed.state === "invalid" ? (
            <Card className="space-y-4">
              <Notice tone="danger" title="This link cannot be used">
                {parsed.message}
              </Notice>
              <ButtonLink href="/" variant="ghost">
                Go to MIRK
              </ButtonLink>
            </Card>
          ) : null}
          {parsed.state === "ok" ? (
            <>
              <Card className="space-y-4">
                <Preview payload={parsed.payload} />
                <Notice title="Anyone holding the complete link can claim it">
                  The code is part of the link itself and never reaches MIRK&apos;s servers. We removed it from your
                  address bar; keep the original message until you have claimed. Test assets have no value.
                </Notice>
              </Card>
              <PrivateGate>
                <Card>
                  <ClaimAction payload={parsed.payload} />
                </Card>
              </PrivateGate>
            </>
          ) : null}
        </main>
      </div>
    </Providers>
  );
}
