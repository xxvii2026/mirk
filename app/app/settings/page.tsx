"use client";

import { useAppKit, useDisconnect } from "@reown/appkit/react";
import { useId, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { useSync } from "@/components/privacy/sync-provider";
import { useOpenVault, useVault } from "@/components/privacy/vault-provider";
import { useHideBalance, useTheme, type ThemePref } from "@/components/shared/theme";
import { Button, Card, ExternalLink, Field, Notice, PageHeader, cx, inputClass } from "@/components/shared/ui";
import {
  deleteStore,
  exportBackup,
  MIN_PASSPHRASE_LENGTH,
  parseBackupFile,
  restoreBackup,
} from "@/lib/crypto-store/vault";
import { userMessage } from "@/lib/gloam/errors";
import { clearTreeCache } from "@/lib/gloam/tree";
import {
  CHAIN_ID,
  EXPLORER_URL,
  PAY_MEMO_ADDRESS,
  POOL_ADDRESS,
  REGISTRY_ADDRESS,
  RPC_URL,
  addressUrl,
} from "@/lib/robinhood/network";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted text-sm">{label}</span>
      <span className="text-sm break-all sm:text-right">{children}</span>
    </div>
  );
}

function BackupSection() {
  const id = useId();
  const vault = useOpenVault();
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [msg, setMsg] = useState<{ tone: "neutral" | "danger" | "signal"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [restorePass, setRestorePass] = useState("");

  return (
    <Card className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-[17px]">Encrypted backup</h2>
        <p className="text-muted text-sm">
          Your private balance can only be spent with keys stored on this device. If you clear this browser or lose the
          device, a backup is the only way back. The file is encrypted with your passphrase and contains no readable
          notes or keys.
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg(null);
          if (pass.length < MIN_PASSPHRASE_LENGTH)
            return setMsg({ tone: "danger", text: `Use at least ${MIN_PASSPHRASE_LENGTH} characters.` });
          if (pass !== pass2) return setMsg({ tone: "danger", text: "The passphrases do not match." });
          setBusy(true);
          try {
            const file = await exportBackup(vault, pass, CHAIN_ID);
            const blob = new Blob([JSON.stringify(file)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `mirk-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setPass("");
            setPass2("");
            setMsg({
              tone: "signal",
              text: "Backup downloaded. Keep the file and the passphrase in separate safe places.",
            });
          } catch (err) {
            setMsg({ tone: "danger", text: userMessage(err) });
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field id={`${id}-p1`} label="Backup passphrase" hint="Nobody can recover a forgotten passphrase.">
          <input
            id={`${id}-p1`}
            type="password"
            autoComplete="new-password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id={`${id}-p2`} label="Repeat passphrase">
          <input
            id={`${id}-p2`}
            type="password"
            autoComplete="new-password"
            value={pass2}
            onChange={(e) => setPass2(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Button type="submit" disabled={busy}>
          {busy ? "Encrypting…" : "Export encrypted backup"}
        </Button>
      </form>

      <form
        className="border-line space-y-4 border-t pt-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg(null);
          const f = fileRef.current?.files?.[0];
          if (!f) return setMsg({ tone: "danger", text: "Choose a backup file." });
          setBusy(true);
          try {
            const parsed = parseBackupFile(await f.text());
            if (parsed.chainId !== CHAIN_ID) throw new Error("This backup is for a different network.");
            const n = await restoreBackup(vault, parsed, restorePass);
            setRestorePass("");
            setMsg({ tone: "signal", text: `Restored ${n} records. Use Rescan to reconcile them with the chain.` });
          } catch (err) {
            setMsg({ tone: "danger", text: userMessage(err) });
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field id={`${id}-file`} label="Restore from backup file">
          <input
            id={`${id}-file`}
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="file:border-line file:bg-surface file:text-ink block min-h-11 text-sm file:mr-3 file:min-h-11 file:rounded-full file:border file:px-4"
          />
        </Field>
        <Field id={`${id}-rp`} label="Backup passphrase">
          <input
            id={`${id}-rp`}
            type="password"
            autoComplete="current-password"
            value={restorePass}
            onChange={(e) => setRestorePass(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Button type="submit" variant="ghost" disabled={busy}>
          Restore backup
        </Button>
      </form>
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
    </Card>
  );
}

export default function SettingsPage() {
  const { pref, setPref } = useTheme();
  const { hidden, setHidden } = useHideBalance();
  const { lock } = useVault();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();
  const { reconcileNow, checkNow } = useSync();
  const [rescan, setRescan] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [clearing, setClearing] = useState(false);

  return (
    <div className="fade-in mx-auto max-w-2xl space-y-6">
      <PageHeader title="Settings" />

      <Card className="space-y-5">
        <h2 className="text-[17px]">Display</h2>
        <div
          role="radiogroup"
          aria-label="Theme"
          className="border-line bg-surface-2 inline-flex rounded-full border p-1"
        >
          {(["light", "dark", "system"] as ThemePref[]).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={pref === t}
              onClick={() => setPref(t)}
              className={cx(
                "min-h-10 rounded-full px-4 text-sm font-medium capitalize",
                pref === t ? "bg-surface shadow-[0_0_0_1px_var(--line)]" : "text-muted",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-[15px]">
          Hide balances by default
          <input
            type="checkbox"
            checked={hidden}
            onChange={(e) => setHidden(e.target.checked)}
            className="size-5 accent-[var(--ink)]"
          />
        </label>
      </Card>

      <Card>
        <h2 className="mb-2 text-[17px]">Network and contracts</h2>
        <div className="divide-line divide-y">
          <Row label="Network">Robinhood Chain testnet ({CHAIN_ID})</Row>
          <Row label="RPC">{RPC_URL}</Row>
          <Row label="Gloam shielded pool">
            <ExternalLink href={addressUrl(POOL_ADDRESS)}>{POOL_ADDRESS}</ExternalLink>
          </Row>
          <Row label="Payment message board">
            <ExternalLink href={addressUrl(PAY_MEMO_ADDRESS)}>{PAY_MEMO_ADDRESS}</ExternalLink>
          </Row>
          <Row label="mirk account registry">
            {REGISTRY_ADDRESS ? (
              <ExternalLink href={addressUrl(REGISTRY_ADDRESS)}>{REGISTRY_ADDRESS}</ExternalLink>
            ) : (
              "Not configured"
            )}
          </Row>
          <Row label="Explorer">
            <ExternalLink href={EXPLORER_URL}>{EXPLORER_URL.replace("https://", "")}</ExternalLink>
          </Row>
        </div>
        <p className="text-muted mt-3 text-xs">Testnet only. Test assets have no value.</p>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-[17px]">Private store</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={lock}>
            Lock private store
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              setRescan("Rescanning the shielded pool…");
              try {
                await clearTreeCache();
                await reconcileNow();
                const r = await checkNow();
                setRescan(r ? `Rescan complete. ${r.found} incoming payment(s) found.` : "Rescan complete.");
              } catch (e) {
                setRescan(userMessage(e));
              }
            }}
          >
            Rescan shielded pool
          </Button>
        </div>
        {rescan ? (
          <p className="text-muted text-sm" aria-live="polite">
            {rescan}
          </p>
        ) : null}
      </Card>

      <BackupSection />

      <Card className="space-y-4">
        <h2 className="text-[17px]">Wallet</h2>
        <p className="text-muted text-sm">{address ? `Connected public wallet ${address}` : "No wallet connected."}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => open({ view: "Account" })}>
            Manage wallet
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              lock();
              void disconnect();
            }}
          >
            Disconnect wallet
          </Button>
        </div>
      </Card>

      <Card className="border-danger/30 space-y-4">
        <h2 className="text-[17px]">Clear local mirk data</h2>
        <Notice tone="danger" title="This can lose money permanently">
          Clearing deletes the encrypted keys for this wallet from this device. Any private balance they hold becomes
          unspendable unless you have an encrypted backup and its passphrase. mirk cannot recover it.
        </Notice>
        <Field id="confirm-clear" label='Type "delete my keys" to confirm'>
          <input
            id="confirm-clear"
            autoComplete="off"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Button
          variant="danger"
          disabled={confirmText !== "delete my keys" || !address || clearing}
          onClick={async () => {
            if (!address) return;
            setClearing(true);
            lock();
            await deleteStore(address);
            await clearTreeCache();
            setConfirmText("");
            setClearing(false);
          }}
        >
          Clear local data
        </Button>
      </Card>
    </div>
  );
}
