"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { getAddress, isAddress } from "viem";
import { useAccount } from "wagmi";
import { Amount } from "@/components/money/amount";
import { AssetSelect } from "@/components/money/asset-select";
import { FlowErrorNotice, FlowProgress, TxLinks, useFlow, type StepDef } from "@/components/money/flow";
import { useOpenVault, useRecords } from "@/components/privacy/vault-provider";
import { Button, ButtonLink, Card, Field, Notice, PageHeader, inputClass } from "@/components/shared/ui";
import { privateBalance } from "@/lib/gloam/notes";
import { cashOut, previewParts, type ServiceContext } from "@/lib/gloam/services";
import { ASSETS } from "@/lib/robinhood/network";
import { AMOUNT_ERRORS, amountToInput, parseAmount } from "@/lib/validation/amount";

const STEPS: StepDef[] = [
  { key: ["preparing", "syncing"], label: "Preparing cash out" },
  { key: "proving", label: "Generating proof on your device" },
  { key: ["submitting", "wallet"], label: "Submitting" },
  { key: "confirming", label: "Confirming on Robinhood Chain" },
  { key: "done", label: "Cashed out" },
];

function addressError(input: string): string | null {
  const s = input.trim();
  if (!s) return "Enter a destination address.";
  if (!/^0x[0-9a-fA-F]{40}$/.test(s)) return "Enter a full EVM address starting with 0x.";
  // Mixed-case input must match its EIP-55 checksum.
  if (s.slice(2) !== s.slice(2).toLowerCase() && !isAddress(s, { strict: true })) {
    return "This address fails its checksum. Check it for typos.";
  }
  if (BigInt(s) === 0n) return "That is the zero address.";
  return null;
}

export default function CashOutPage() {
  const id = useId();
  const vault = useOpenVault();
  const notes = useRecords("note");
  const { address: connected } = useAccount();
  const [asset, setAsset] = useState(ASSETS[0]!);
  const [to, setTo] = useState("");
  const [input, setInput] = useState("");
  const [touched, setTouched] = useState(false);
  const [ack, setAck] = useState(false);

  const balance = privateBalance(notes, asset.address);
  const parsed = parseAmount(input, asset.decimals);
  const amount = parsed.ok ? parsed.value : 0n;
  const parts = parsed.ok && amount <= balance ? previewParts(vault, asset.address, amount) : null;
  const toError = touched ? addressError(to) : null;
  const amountError = useMemo(() => {
    if (!touched) return null;
    if (!parsed.ok) return AMOUNT_ERRORS[parsed.reason];
    if (parsed.value > balance) return "That is more than your private balance.";
    if (parts === null) return "This amount needs too many separate transactions. Cash out a smaller amount first.";
    return null;
  }, [touched, parsed, balance, parts]);

  const action = useCallback(
    (ctx: ServiceContext) => cashOut(ctx, getAddress(to.trim().toLowerCase()), asset.address, amount),
    [to, asset.address, amount],
  );
  const flow = useFlow(action);
  const busy = flow.phase === "running";

  if (flow.phase === "done" && flow.result) {
    return (
      <div className="fade-in mx-auto max-w-lg">
        <PageHeader title="Cashed out" />
        <Card className="space-y-5">
          <p className="text-[36px]">
            <Amount value={amount} decimals={asset.decimals} symbol={asset.symbol} />
          </p>
          <p className="text-muted text-[15px]">
            Confirmed on Robinhood Chain testnet. The destination and amount are public.
          </p>
          <TxLinks hashes={flow.result.hashes} />
          <ButtonLink href="/app">Done</ButtonLink>
        </Card>
      </div>
    );
  }

  return (
    <div className="fade-in mx-auto max-w-lg">
      <PageHeader title="Cash out" description="Move money from your private balance to a public wallet." />
      <Card>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!parsed.ok || amountError || addressError(to) || !ack) return;
            void flow.run();
          }}
        >
          <Field id={`${id}-to`} label="Destination address" error={toError}>
            <div className="flex gap-2">
              <input
                id={`${id}-to`}
                autoComplete="off"
                spellCheck={false}
                placeholder="0x…"
                value={to}
                disabled={busy}
                onChange={(e) => setTo(e.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={Boolean(toError)}
                aria-describedby={toError ? `${id}-to-error` : undefined}
                className={`${inputClass} tabular text-sm`}
              />
              {connected ? (
                <Button variant="ghost" disabled={busy} onClick={() => setTo(connected)}>
                  My wallet
                </Button>
              ) : null}
            </div>
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <AssetSelect
              value={asset}
              onChange={(a) => {
                setAsset(a);
                setInput("");
              }}
            />
            <p className="text-muted text-sm">
              Private balance{" "}
              <Amount value={balance} decimals={asset.decimals} symbol={asset.symbol} className="text-ink" />
            </p>
          </div>

          <Field
            id={`${id}-amount`}
            label={`Amount (${asset.symbol})`}
            error={amountError}
            hint={
              parts && parts > 1 ? `This needs ${parts} separate transactions, each confirmed on chain.` : undefined
            }
          >
            <div className="flex gap-2">
              <input
                id={`${id}-amount`}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={input}
                disabled={busy}
                onChange={(e) => setInput(e.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={Boolean(amountError)}
                aria-describedby={amountError ? `${id}-amount-error` : `${id}-amount-hint`}
                className={`${inputClass} tabular`}
              />
              {balance > 0n ? (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setInput(amountToInput(balance, asset.decimals));
                    setTouched(true);
                  }}
                >
                  Max
                </Button>
              ) : null}
            </div>
          </Field>

          <Notice tone="danger" title="This becomes public">
            The destination address and the amount will be visible to anyone on Robinhood Chain. Your other private
            money and past private transfers stay private. A cash out of the exact amount you just added can be linked
            by timing.
          </Notice>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[15px]">
            <input
              type="checkbox"
              checked={ack}
              disabled={busy}
              onChange={(e) => setAck(e.target.checked)}
              className="mt-1 size-5 accent-[var(--ink)]"
            />
            I understand the destination and amount become public.
          </label>

          {busy ? (
            <>
              <FlowProgress steps={STEPS} current={flow.step} part={flow.part} />
              {flow.step === "proving" ? (
                <p className="text-muted text-sm">This cash out is being proved on your device.</p>
              ) : null}
            </>
          ) : (
            <Button type="submit" className="w-full" disabled={!ack}>
              Cash out
            </Button>
          )}
          <FlowErrorNotice flow={flow} onRetry={() => flow.run()} />
        </form>
      </Card>
    </div>
  );
}
