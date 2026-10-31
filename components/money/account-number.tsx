"use client";

import { useState } from "react";
import { Button, Notice, Pill, SignalDot } from "@/components/shared/ui";
import { useRecords } from "@/components/privacy/vault-provider";
import { useSync } from "@/components/privacy/sync-provider";
import { formatAccountNumber } from "@/lib/account-number";

export function useAccountRecord() {
  return useRecords("account")[0]?.value ?? null;
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      className="min-w-24"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
    >
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </Button>
  );
}

export function AccountNumberText({ number, className }: { number: string; className?: string }) {
  return (
    <span
      className={`tabular tracking-[0.04em] ${className ?? ""}`}
      aria-label={`Account number ${number.split("").join(" ")}`}
    >
      {formatAccountNumber(number)}
    </span>
  );
}

export function AccountStatus() {
  const account = useAccountRecord();
  const { registrationError, retryRegistration } = useSync();
  if (!account) return <span className="text-muted text-sm">Creating your account number…</span>;
  if (account.status === "active")
    return (
      <Pill tone="signal">
        <SignalDot /> Active
      </Pill>
    );
  return (
    <div className="space-y-2">
      <Pill>{account.status === "pending" ? "Registering on chain…" : "Not registered yet"}</Pill>
      {registrationError ? (
        <Notice tone="danger">
          {registrationError}{" "}
          <button
            type="button"
            className="text-ink font-medium underline underline-offset-4"
            onClick={retryRegistration}
          >
            Retry
          </button>
        </Notice>
      ) : null}
    </div>
  );
}
