"use client";

import { useState } from "react";
import { ActivityList } from "@/components/dashboard/activity-list";
import { CopyButton } from "@/components/money/account-number";
import { useSync } from "@/components/privacy/sync-provider";
import { useRecords } from "@/components/privacy/vault-provider";
import { useHideBalance } from "@/components/shared/theme";
import { Button, Card, Notice, PageHeader, Pill } from "@/components/shared/ui";
import { userMessage } from "@/lib/gloam/errors";
import { assetByAddress } from "@/lib/robinhood/network";
import { formatAmount } from "@/lib/validation/amount";

export default function ActivityPage() {
  const { hidden } = useHideBalance();
  const { reconcileNow, checkNow } = useSync();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "neutral" | "danger"; text: string } | null>(null);
  const claims = useRecords("claim")
    .filter((c) => c.value.status === "open" || c.value.status === "funding")
    .sort((a, b) => b.value.createdAt - a.value.createdAt);

  return (
    <div className="fade-in mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Activity"
        description="Your private history is stored encrypted on this device only. It is not on any server."
      />
      <Card>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">History</h2>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setMsg(null);
              try {
                await reconcileNow();
                await checkNow();
                setMsg({ tone: "neutral", text: "Reconciled with Robinhood Chain." });
              } catch (e) {
                setMsg({ tone: "danger", text: userMessage(e) });
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Reconciling…" : "Rescan and reconcile"}
          </Button>
        </div>
        {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
        <ActivityList hidden={hidden} />
      </Card>

      {claims.length ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">Your open claim links</h2>
          <p className="text-muted text-sm">
            Anyone holding a link can claim it. To take money back, open the link yourself and claim it into this
            account.
          </p>
          <ul className="divide-line divide-y">
            {claims.map(({ id, value }) => {
              const a = assetByAddress(value.asset);
              return (
                <li key={id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="tabular font-semibold">
                    {a ? formatAmount(BigInt(value.amountWei), a.decimals) : value.amountWei}{" "}
                    <span className="text-muted">{a?.symbol}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Pill>{value.status === "funding" ? "Funding" : "Open"}</Pill>
                    <CopyButton text={value.link} label="Copy link" />
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
