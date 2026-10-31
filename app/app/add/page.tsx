"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { erc20Abi } from "viem";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { Amount } from "@/components/money/amount";
import { AssetSelect } from "@/components/money/asset-select";
import { FlowErrorNotice, FlowProgress, TxLinks, useFlow, type StepDef } from "@/components/money/flow";
import { Button, ButtonLink, Card, Field, Notice, PageHeader, inputClass } from "@/components/shared/ui";
import { addMoney, type ServiceContext } from "@/lib/shielded/services";
import { ASSETS, CHAIN_ID, isNativeAsset } from "@/lib/robinhood/network";
import { AMOUNT_ERRORS, amountToInput, parseAmount } from "@/lib/validation/amount";

const STEPS: StepDef[] = [
  { key: "preparing", label: "Preparing private note" },
  { key: "proving", label: "Generating proof" },
  { key: ["approving", "wallet"], label: "Awaiting wallet" },
  { key: "confirming", label: "Confirming on Robinhood Chain" },
  { key: "done", label: "Added to private balance" },
];

// Keep a little ETH back for gas when adding native ETH.
const GAS_RESERVE = 50_000_000_000_000n; // 0.00005 ETH

export default function AddMoneyPage() {
  const id = useId();
  const { address } = useAccount();
  const [asset, setAsset] = useState(ASSETS[0]!);
  const [input, setInput] = useState("");
  const [touched, setTouched] = useState(false);
  const native = isNativeAsset(asset);

  const nativeBal = useBalance({ address, chainId: CHAIN_ID, query: { enabled: Boolean(address) && native } });
  const tokenBal = useReadContract({
    address: asset.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: Boolean(address) && !native },
  });
  const publicBalance: bigint | undefined = native ? nativeBal.data?.value : tokenBal.data;

  const parsed = parseAmount(input, asset.decimals);
  const error = useMemo(() => {
    if (!touched) return null;
    if (!parsed.ok) return AMOUNT_ERRORS[parsed.reason];
    if (publicBalance !== undefined && parsed.value > publicBalance)
      return "That is more than your public wallet holds.";
    if (native && publicBalance !== undefined && parsed.value > publicBalance - GAS_RESERVE)
      return "Leave a little ETH in your wallet to pay for gas.";
    return null;
  }, [touched, parsed, publicBalance, native]);

  const amount = parsed.ok ? parsed.value : 0n;
  const action = useCallback((ctx: ServiceContext) => addMoney(ctx, asset.address, amount), [asset.address, amount]);
  const flow = useFlow(action);
  const busy = flow.phase === "running";

  if (flow.phase === "done" && flow.result) {
    return (
      <div className="fade-in mx-auto max-w-lg">
        <PageHeader title="Added to private balance" />
        <Card className="space-y-5">
          <p className="text-[36px]">
            <Amount value={amount} decimals={asset.decimals} symbol={asset.symbol} />
          </p>
          <p className="text-muted text-[15px]">
            Confirmed on Robinhood Chain testnet. Only you can see your private balance.
          </p>
          <TxLinks hashes={[flow.result.hash]} />
          <div className="flex gap-2">
            <ButtonLink href="/app">Done</ButtonLink>
            <Button
              variant="ghost"
              onClick={() => {
                flow.reset();
                setInput("");
                setTouched(false);
              }}
            >
              Add more
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fade-in mx-auto max-w-lg">
      <PageHeader title="Add money" description="Move test assets from your public wallet into your private balance." />
      <Card>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!parsed.ok || error) return;
            void flow.run();
          }}
        >
          <AssetSelect
            value={asset}
            onChange={(a) => {
              setAsset(a);
              setInput("");
              setTouched(false);
            }}
          />
          <div className="bg-surface-2 rounded-2xl p-4">
            <p className="text-muted text-sm">Public wallet balance</p>
            <p className="text-xl">
              {publicBalance === undefined ? (
                <span className="text-muted">…</span>
              ) : (
                <Amount value={publicBalance} decimals={asset.decimals} symbol={asset.symbol} />
              )}
            </p>
            <p className="text-muted mt-1 text-xs">
              Visible to anyone on the explorer. This is separate from your private balance.
            </p>
          </div>

          <Field
            id={`${id}-amount`}
            label={`Amount (${asset.symbol})`}
            error={error}
            hint="Adding money is a public deposit: the amount is visible on chain."
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
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-amount-error` : `${id}-amount-hint`}
                className={`${inputClass} tabular`}
              />
              {publicBalance !== undefined && publicBalance > 0n ? (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    const max = native
                      ? publicBalance > GAS_RESERVE
                        ? publicBalance - GAS_RESERVE
                        : 0n
                      : publicBalance;
                    setInput(amountToInput(max, asset.decimals));
                    setTouched(true);
                  }}
                >
                  Max
                </Button>
              ) : null}
            </div>
          </Field>

          {busy ? (
            <>
              <FlowProgress steps={STEPS} current={flow.step} />
              {flow.step === "proving" ? (
                <p className="text-muted text-sm">This payment is being proved on your device.</p>
              ) : null}
            </>
          ) : (
            <Button type="submit" className="w-full">
              Add to private balance
            </Button>
          )}
          <FlowErrorNotice flow={flow} onRetry={() => flow.run()} />
          {publicBalance === 0n ? (
            <Notice title="Your public wallet is empty">
              Get free test {asset.symbol} from the Robinhood Chain testnet faucet, then come back. Test assets have no
              value.
            </Notice>
          ) : null}
        </form>
      </Card>
    </div>
  );
}
