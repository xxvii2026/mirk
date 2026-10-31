"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { AccountNumberText, CopyButton } from "@/components/money/account-number";
import { Amount } from "@/components/money/amount";
import { AssetSelect } from "@/components/money/asset-select";
import { FlowErrorNotice, FlowProgress, TxLinks, useFlow, type StepDef } from "@/components/money/flow";
import { useOpenVault, useRecords } from "@/components/privacy/vault-provider";
import {
  Button,
  ButtonLink,
  Card,
  Field,
  Notice,
  PageHeader,
  Pill,
  SignalDot,
  cx,
  inputClass,
} from "@/components/shared/ui";
import { checkAccountNumber, formatAccountNumber } from "@/lib/account-number";
import { privateBalance } from "@/lib/shielded/notes";
import { createClaimLink, previewParts, sendToAccount, type ServiceContext } from "@/lib/shielded/services";
import { useResolveAccount } from "@/lib/hooks/use-resolve";
import { ASSETS } from "@/lib/robinhood/network";
import { AMOUNT_ERRORS, amountToInput, parseAmount } from "@/lib/validation/amount";

const STEPS: StepDef[] = [
  { key: ["preparing", "syncing"], label: "Preparing payment" },
  { key: "proving", label: "Generating proof on your device" },
  { key: ["submitting", "wallet"], label: "Submitting privately" },
  { key: "confirming", label: "Confirming on Robinhood Chain" },
  { key: "delivering", label: "Delivering encrypted payment note" },
  { key: "done", label: "Sent" },
];

type Mode = "account" | "link";

export default function SendPage() {
  const id = useId();
  const vault = useOpenVault();
  const notes = useRecords("note");
  const [mode, setMode] = useState<Mode>("account");
  const [asset, setAsset] = useState(ASSETS[0]!);
  const [recipient, setRecipient] = useState("");
  const [input, setInput] = useState("");
  const [touched, setTouched] = useState(false);

  const balance = privateBalance(notes, asset.address);
  const resolution = useResolveAccount(recipient);
  const parsed = parseAmount(input, asset.decimals);
  const amount = parsed.ok ? parsed.value : 0n;
  const parts = parsed.ok && amount <= balance ? previewParts(vault, asset.address, amount) : null;

  const amountError = useMemo(() => {
    if (!touched) return null;
    if (!parsed.ok) return AMOUNT_ERRORS[parsed.reason];
    if (parsed.value > balance) return "That is more than your private balance.";
    if (parts === null) return "This amount needs too many separate transfers. Send a smaller amount first.";
    return null;
  }, [touched, parsed, balance, parts]);

  const accountCheck = checkAccountNumber(recipient);
  const action = useCallback(
    (ctx: ServiceContext) =>
      mode === "account"
        ? accountCheck.ok
          ? sendToAccount(ctx, accountCheck.value, asset.address, amount).then((r) => ({
              ...r,
              link: null as string | null,
            }))
          : Promise.reject(new Error("Enter a valid Mirk account number."))
        : createClaimLink(ctx, asset.address, amount, window.location.origin),
    [mode, accountCheck, asset.address, amount],
  );
  const flow = useFlow(action);
  const busy = flow.phase === "running";

  const recipientOk = mode === "link" || resolution.state === "valid";

  if (flow.phase === "done" && flow.result) {
    const r = flow.result;
    return (
      <div className="fade-in mx-auto max-w-lg">
        <PageHeader title={r.link ? "Claim link ready" : "Sent privately"} />
        <Card className="space-y-5">
          <p className="text-[36px]">
            <Amount value={amount} decimals={asset.decimals} symbol={asset.symbol} />
          </p>
          {r.link ? (
            <>
              <Notice tone="signal" title="Anyone with this link can claim the money">
                Share it only with the person you mean to pay, through a channel you trust. The link is saved encrypted
                in your Activity so you can copy it again or claim it back.
              </Notice>
              <div className="border-line bg-surface-2 text-muted rounded-2xl border p-3 text-sm break-all select-all">
                {r.link}
              </div>
              <CopyButton text={r.link} label="Copy link" />
            </>
          ) : (
            <p className="text-muted text-[15px]">
              Confirmed on chain. The amount and recipient are not public. The recipient&apos;s Mirk will find the
              payment automatically.
            </p>
          )}
          <TxLinks hashes={r.hashes} />
          <div className="flex gap-2">
            <ButtonLink href="/app">Done</ButtonLink>
            <Button
              variant="ghost"
              onClick={() => {
                flow.reset();
                setInput("");
                setRecipient("");
                setTouched(false);
              }}
            >
              Send another
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fade-in mx-auto max-w-lg">
      <PageHeader title="Send privately" description="The amount and recipient stay off the public record." />
      <Card>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!parsed.ok || amountError || !recipientOk) return;
            void flow.run();
          }}
        >
          <div
            role="tablist"
            aria-label="Send to"
            className="border-line bg-surface-2 grid grid-cols-2 rounded-full border p-1"
          >
            {(
              [
                ["account", "Mirk account"],
                ["link", "Claim link"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                disabled={busy}
                onClick={() => setMode(m)}
                className={cx(
                  "min-h-10 rounded-full text-sm font-medium",
                  mode === m ? "bg-surface shadow-[0_0_0_1px_var(--line)]" : "text-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "account" ? (
            <Field
              id={`${id}-to`}
              label="Mirk account number"
              error={
                resolution.state === "invalid"
                  ? resolution.message
                  : resolution.state === "unknown"
                    ? "No Mirk account has this number."
                    : resolution.state === "error"
                      ? resolution.message
                      : null
              }
            >
              <input
                id={`${id}-to`}
                inputMode="numeric"
                autoComplete="off"
                placeholder="0000 0000 0000"
                value={recipient}
                disabled={busy}
                onChange={(e) => setRecipient(e.target.value)}
                onBlur={() => accountCheck.ok && setRecipient(formatAccountNumber(accountCheck.value))}
                aria-invalid={resolution.state === "invalid" || resolution.state === "unknown"}
                aria-describedby={`${id}-to-error ${id}-to-status`}
                className={`${inputClass} tabular tracking-[0.06em]`}
              />
              <p id={`${id}-to-status`} aria-live="polite" className="min-h-6 text-sm">
                {resolution.state === "checking" ? <span className="text-muted">Checking…</span> : null}
                {resolution.state === "valid" ? (
                  <Pill tone="signal">
                    <SignalDot /> Valid Mirk account
                  </Pill>
                ) : null}
              </p>
            </Field>
          ) : (
            <Notice title="Pay someone without Mirk">
              Mirk creates a one-time key on this device, sends the money to it privately, and gives you a link. Whoever
              opens the link can claim the money into their own Mirk account.
            </Notice>
          )}

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
              parts && parts > 1
                ? `This will be sent as ${parts} separate private transfers, one after another.`
                : undefined
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

          {busy ? (
            <>
              <FlowProgress steps={STEPS} current={flow.step} part={flow.part} />
              {flow.step === "proving" ? (
                <p className="text-muted text-sm">This payment is being proved on your device.</p>
              ) : null}
            </>
          ) : (
            <Button type="submit" className="w-full" disabled={!recipientOk && mode === "account"}>
              {mode === "account" ? "Send privately" : "Create claim link"}
            </Button>
          )}
          <FlowErrorNotice flow={flow} onRetry={() => flow.run()} />
          {balance === 0n && !busy ? (
            <Notice>
              Your private {asset.symbol} balance is empty.{" "}
              <a className="text-ink font-medium underline underline-offset-4" href="/app/add">
                Add money
              </a>{" "}
              first.
            </Notice>
          ) : null}
          {resolution.state === "valid" && accountCheck.ok ? (
            <p className="sr-only">
              Sending to <AccountNumberText number={accountCheck.value} />
            </p>
          ) : null}
        </form>
      </Card>
    </div>
  );
}
