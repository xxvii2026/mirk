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
import { IconLock, IconPlus, IconReceive, IconSend, IconWallet } from "@/components/shared/icons";
import { ButtonLink, Card, Pill } from "@/components/shared/ui";
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
    <div className="fade-in space-y-5">
      <header className="space-y-1.5">
        <h1 className="text-[30px] leading-[1.1] font-light tracking-[-0.02em] sm:text-[34px]">Home</h1>
        <p className="text-ink-2 text-[15px]">What you hold, readable by you alone.</p>
      </header>

      <Card className="relative isolate space-y-8 overflow-hidden sm:p-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[15px]">Your private balance</h2>
            <Pill tone="signal">
              <IconLock className="size-3" /> Only you
            </Pill>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setHidden(!hidden)}
              className="text-ink-2 hover:text-ink min-h-11 px-2 text-sm"
              aria-pressed={hidden}
            >
              {hidden ? "Show" : "Hide"}
            </button>
            <AssetSelect value={asset} onChange={setAsset} />
          </div>
        </div>

        <div className="space-y-3">
          <p className="tabular min-h-[3.5rem] text-[52px] leading-none font-light tracking-[-0.03em] sm:text-[72px]">
            <Amount
              value={balance}
              decimals={asset.decimals}
              symbol={asset.symbol}
              hidden={hidden}
              className="font-light!"
            />
          </p>
          <p className="text-ink-2 text-[15px]">Only you can see this amount.</p>
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

        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <ButtonLink href="/app/add" className="col-span-3 min-h-12 px-6">
            <IconPlus className="size-4" /> Add money
          </ButtonLink>
          {(
            [
              ["/app/send", "Send", IconSend],
              ["/app/receive", "Receive", IconReceive],
              ["/app/cash-out", "Cash out", IconWallet],
            ] as const
          ).map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              className="hover:bg-surface-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-4 text-[15px] font-medium transition-colors"
            >
              <Icon className="size-4" /> {label}
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[17px]">Recent private activity</h2>
            <Link href="/app/activity" className="text-muted hover:text-ink min-h-11 content-center text-sm">
              See all
            </Link>
          </div>
          <ActivityList limit={5} hidden={hidden} />
        </Card>

        <div className="space-y-5">
          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[17px]">Your mirk account</h2>
              <AccountStatus />
            </div>
            {account ? (
              <>
                <p className="tabular text-[28px] font-light tracking-[-0.01em]">
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
            <h2 className="text-[17px]">How privacy works here</h2>
            <p className="text-muted text-sm">
              Your money sits in Gloam&apos;s shielded pool on Robinhood Chain. The keys that can spend it are encrypted
              on this device. Nobody, including mirk, can move your money.
            </p>
            <p className="text-muted text-sm">
              Adding money and cashing out are public. Balances and private transfers are not.
            </p>
          </Card>

          <Card className="space-y-1">
            <h2 className="mb-2 text-[17px]">More</h2>
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
