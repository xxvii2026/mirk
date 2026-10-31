"use client";

import {
  AccountNumberText,
  AccountStatus,
  CopyButton,
  useAccountRecord,
} from "@/components/money/account-number";
import { useSync } from "@/components/privacy/sync-provider";
import { useRecords } from "@/components/privacy/vault-provider";
import { Button, Card, Notice, PageHeader, Pill } from "@/components/shared/ui";
import { assetByAddress } from "@/lib/robinhood/network";
import { formatAmount } from "@/lib/validation/amount";

const INCOMING_STATUS = {
  found: { label: "Found, securing", tone: "neutral" },
  sweeping: { label: "Securing", tone: "neutral" },
  swept: { label: "In your balance", tone: "signal" },
  lost: { label: "Taken back by sender", tone: "danger" },
} as const;

export default function ReceivePage() {
  const account = useAccountRecord();
  const { inboxStatus, inboxError, lastChecked, checkNow } = useSync();
  const incoming = useRecords("incoming")
    .filter((r) => r.value.source === "account")
    .sort((a, b) => b.value.createdAt - a.value.createdAt);

  return (
    <div className="fade-in mx-auto max-w-lg space-y-6">
      <PageHeader
        title="Receive"
        description="Share your Mirk account number. No name, wallet address or balance is revealed."
      />
      <Card className="space-y-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-muted text-sm">Your Mirk account number</h2>
          <AccountStatus />
        </div>
        {account ? (
          <>
            <p className="text-[32px] font-semibold">
              <AccountNumberText number={account.number} />
            </p>
            <div className="flex flex-wrap items-end gap-4">
              <CopyButton text={account.number} label="Copy number" />
            </div>
          </>
        ) : (
          <p className="text-muted">Creating your account number…</p>
        )}
        <p className="text-muted text-sm">
          Payers send privately to this number. The payment note is encrypted so only this device can open it, and Mirk
          then moves it into a note only you know before counting it in your balance.
        </p>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[17px]">Incoming payments</h2>
          <Button variant="ghost" disabled={inboxStatus === "checking"} onClick={() => void checkNow()}>
            {inboxStatus === "checking" ? "Checking…" : "Check now"}
          </Button>
        </div>
        <p className="text-muted text-sm" aria-live="polite">
          {lastChecked
            ? `Last checked ${new Date(lastChecked).toLocaleTimeString()}. Mirk checks every minute while open.`
            : "Checking for payments…"}
        </p>
        {inboxError ? <Notice tone="danger">{inboxError}</Notice> : null}
        {incoming.length === 0 ? (
          <p className="text-muted text-[15px]">No incoming payments found yet.</p>
        ) : (
          <ul className="divide-line divide-y">
            {incoming.map(({ id, value }) => {
              const a = assetByAddress(value.asset);
              const st = INCOMING_STATUS[value.status];
              return (
                <li key={id} className="flex items-center justify-between py-3">
                  <span className="tabular font-semibold">
                    +{a ? formatAmount(BigInt(value.amountWei), a.decimals) : value.amountWei}{" "}
                    <span className="text-muted">{a?.symbol}</span>
                  </span>
                  <Pill tone={st.tone}>{st.label}</Pill>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
