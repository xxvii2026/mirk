"use client";

import Link from "next/link";
import { useState } from "react";
import { ActivityList } from "@/components/dashboard/activity-list";
import {
  AccountNumberText,
  AccountQr,
  AccountStatus,
  CopyButton,
  useAccountRecord,
} from "@/components/money/account-number";
import { Amount } from "@/components/money/amount";
import { AssetSelect } from "@/components/money/asset-select";
import { useRecords } from "@/components/privacy/vault-provider";
import { useHideBalance } from "@/components/shared/theme";
import { ButtonLink, Card, Pill, SignalDot } from "@/components/shared/ui";
import { incomingBalance, privateBalance } from "@/lib/gloam/notes";
import { ASSETS } from "@/lib/robinhood/network";

export default function Dashboard() {
  const [asset, setAsset] = useState(ASSETS[0]!);
  const notes = useRecords("note");
  const account = useAccountRecord();
  const { hidden, setHidden } = useHideBalance();
  const balance = privateBalance(notes, asset.address);
  const settling = incomingBalance(notes, asset.address);

  return (
    <div className="fade-in space-y-6">
      <h1 className="sr-only">Home</h1>
      <Card className="stage-soft space-y-6 border-transparent">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Pill tone="signal">
              <SignalDot /> Private
            </Pill>
            <Pill>Robinhood Chain testnet</Pill>
          </div>
          <AssetSelect value={asset} onChange={setAsset} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-ink-2 text-sm">Your private balance</h2>
            <button
              type="button"
              onClick={() => setHidden(!hidden)}
              className="text-ink-2 hover:text-ink min-h-11 px-1 text-sm underline-offset-4 hover:underline"
              aria-pressed={hidden}
            >
              {hidden ? "Show" : "Hide"}
            </button>
          </div>
          <p className="min-h-[3.5rem] text-[44px] leading-none tracking-[-0.035em] sm:text-[60px]">
            <Amount value={balance} decimals={asset.decimals} symbol={asset.symbol} hidden={hidden} />
          </p>
          <p className="text-ink-2 text-sm">Only you can see this amount.</p>
          {settling > 0n ? (
            <p className="text-ink-2 text-sm">
              Plus{" "}
              <Amount
                value={settling}
                decimals={asset.decimals}
                symbol={asset.symbol}
                hidden={hidden}
                className="text-[18px]"
              />{" "}
              settling
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ButtonLink href="/app/add">Add money</ButtonLink>
          <ButtonLink href="/app/send" variant="ghost">
            Send
          </ButtonLink>
          <ButtonLink href="/app/receive" variant="ghost">
            Receive
          </ButtonLink>
          <ButtonLink href="/app/cash-out" variant="ghost">
            Cash out
          </ButtonLink>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent private activity</h2>
            <Link href="/app/activity" className="text-muted hover:text-ink min-h-11 content-center text-sm">
              See all
            </Link>
          </div>
          <ActivityList limit={5} hidden={hidden} />
        </Card>

        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Your MIRK account</h2>
              <AccountStatus />
            </div>
            {account ? (
              <>
                <p className="text-[26px] font-semibold">
                  <AccountNumberText number={account.number} />
                </p>
                <div className="flex flex-wrap items-end gap-4">
                  <AccountQr number={account.number} size={112} />
                  <CopyButton text={account.number} label="Copy number" />
                </div>
                <p className="text-muted text-sm">
                  Share this number to get paid. It reveals no name, wallet or balance.
                </p>
              </>
            ) : null}
          </Card>

          <Card className="space-y-3">
            <h2 className="text-lg font-semibold">How privacy works here</h2>
            <p className="text-muted text-sm">
              Your money sits in Gloam&apos;s shielded pool on Robinhood Chain. The keys that can spend it are encrypted
              on this device. Nobody, including MIRK, can move your money.
            </p>
            <p className="text-muted text-sm">
              Adding money and cashing out are public. Balances and private transfers are not.
            </p>
          </Card>

          <Card className="space-y-1">
            <h2 className="mb-2 text-lg font-semibold">More</h2>
            {[
              { href: "/app/trade", label: "Trade" },
              { href: "/app/marketplace", label: "Marketplace" },
            ].map((x) => (
              <Link
                key={x.href}
                href={x.href}
                className="hover:text-muted flex min-h-11 items-center justify-between text-[15px]"
              >
                {x.label} <span className="text-muted text-xs">Coming soon</span>
              </Link>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
