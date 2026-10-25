"use client";

import { useRecords } from "@/components/privacy/vault-provider";
import { ExternalLink, HiddenDots, Pill } from "@/components/shared/ui";
import type { ActivityRecord } from "@/lib/crypto-store/records";
import { assetByAddress, txUrl } from "@/lib/robinhood/network";
import { formatAmount } from "@/lib/validation/amount";

const LABELS: Record<ActivityRecord["type"], string> = {
  added: "Added money",
  sent: "Sent privately",
  received: "Received privately",
  "claim-created": "Claim link created",
  "claim-swept": "Claim link swept",
  "cashed-out": "Cashed out",
};

const OUTGOING = new Set<ActivityRecord["type"]>(["sent", "claim-created", "cashed-out"]);

const STATUS: Record<ActivityRecord["status"], { label: string; tone: "neutral" | "signal" | "danger" }> = {
  pending: { label: "Confirming", tone: "neutral" },
  confirmed: { label: "Confirmed", tone: "signal" },
  partial: { label: "Partly done", tone: "danger" },
  failed: { label: "Not completed", tone: "danger" },
};

const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function ActivityList({ limit, hidden = false }: { limit?: number; hidden?: boolean }) {
  const items = useRecords("activity")
    .sort((a, b) => b.value.createdAt - a.value.createdAt)
    .slice(0, limit);

  if (items.length === 0) {
    return <p className="text-muted py-6 text-[15px]">No private activity on this device yet.</p>;
  }

  return (
    <ul className="divide-line divide-y">
      {items.map(({ id, value: a }) => {
        const asset = assetByAddress(a.asset);
        const st = STATUS[a.status];
        return (
          <li key={id} className="flex items-start justify-between gap-4 py-4">
            <div className="min-w-0 space-y-1">
              <p className="text-[15px] font-medium">{LABELS[a.type]}</p>
              <p className="text-muted text-sm">
                {fmt.format(a.createdAt)}
                {a.detail ? ` · ${a.detail}` : ""}
              </p>
              {a.error ? <p className="text-muted text-sm">{a.error}</p> : null}
              {a.txHashes.length ? (
                <p className="flex flex-wrap gap-x-3 text-sm">
                  {a.txHashes.map((h, i) => (
                    <ExternalLink key={h} href={txUrl(h)} className="text-muted">
                      {a.txHashes.length > 1 ? `Tx ${i + 1}` : "Transaction"}
                    </ExternalLink>
                  ))}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 space-y-1 text-right">
              <p className="tabular text-[15px] font-semibold">
                {hidden ? (
                  <HiddenDots />
                ) : (
                  <>
                    {OUTGOING.has(a.type) ? "−" : "+"}
                    {asset ? formatAmount(BigInt(a.amountWei), asset.decimals) : a.amountWei}
                  </>
                )}{" "}
                <span className="text-muted">{asset?.symbol ?? ""}</span>
              </p>
              <Pill tone={st.tone}>{st.label}</Pill>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
