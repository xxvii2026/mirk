/**
 * mirk's application services over the Mirk SDK. React components call these;
 * they never assemble proofs or calldata themselves.
 *
 * Every secret is encrypted into the private store before the transaction that
 * depends on it is broadcast, and nothing is reported as done until its
 * receipt is confirmed on Robinhood Chain testnet.
 */

import {
  buildPrivateSendIntent,
  buildShieldBoundIntent,
  buildUnshieldIntent,
  decodeNotePackage,
  encodeNotePackage,
  generateReceiveKey,
  notePackageToExport,
  POOL_TRANSFER_ABI,
  scanIncomingPayments,
  sealToReceiveTag,
  sweepReceivedNote,
  transferCallArgs,
  type MirkIntent,
  type IntentExec,
  type NoteExport,
  type PrivateSendIntent,
  type ReceiveKeyJwk,
  type SweepChain,
} from "@/lib/shielded/sdk";
import {
  erc20Abi,
  getAddress,
  type Account,
  type Address,
  type Chain,
  type Hex,
  type PublicClient,
  type Transport,
  type WalletClient,
} from "viem";
import { formatAccountNumber, generateAccountNumber, type AccountNumber } from "../account-number";
import type {
  AccountRecord,
  ActivityRecord,
  ActivityType,
  ClaimRecord,
  IncomingRecord,
  NoteRecord,
} from "../crypto-store/records";
import type { PrivateVault, StoredRecord } from "../crypto-store/vault";
import {
  CHAIN,
  assertPoolConfigured,
  MEMO_DEPLOY_BLOCK,
  CHAIN_ID,
  LOG_CHUNK_BLOCKS,
  NETWORK,
  PAY_MEMO_ADDRESS,
  POOL_ADDRESS,
  REGISTRY_ADDRESS,
  assertTestnet,
  isNativeAsset,
} from "../robinhood/network";
import { resolveAccount } from "../registry/client";
import { PAY_MEMO_ABI, REGISTRY_ABI, SHIELD_BOUND_ABI, UNSHIELD_ABI } from "./abi";
import { claimKeyJwk, encodeClaimPackage, type ClaimPayload } from "./claim-package";
import { isUserRejection } from "./errors";
import { selectNotes, spendable, type SpendPart } from "./notes";
import { workerProver } from "./prover";
import { RelayUnavailableError, relayPaymentMemo, relaySpend, ticketToMemoBytes } from "./submit";
import { POOL_STATE_READ_ABI, syncPoolTree } from "./tree";

export type SignerClient = WalletClient<Transport, Chain, Account>;

export type Step =
  "preparing" | "proving" | "approving" | "wallet" | "submitting" | "confirming" | "delivering" | "syncing" | "done";

export interface ServiceContext {
  vault: PrivateVault;
  client: PublicClient;
  /** Needed for deposits, and for spends when the relay is unavailable. */
  wallet?: SignerClient | null;
  walletChainId?: number;
  /** Person agreed to submit from their own wallet if the private relay fails. */
  allowWalletSubmit?: boolean;
  onStep?: (step: Step, detail?: { part?: number; parts?: number }) => void;
}

export class FlowError extends Error {
  constructor(
    message: string,
    readonly code:
      "relay-unavailable" | "insufficient" | "not-ready" | "rejected" | "reverted" | "unknown-account" | "no-registry",
  ) {
    super(message);
    this.name = "FlowError";
  }
}

const now = () => Date.now();

function requireWallet(ctx: ServiceContext): SignerClient {
  assertPoolConfigured();
  if (!ctx.wallet) throw new FlowError("Connect your wallet to continue.", "not-ready");
  assertTestnet(ctx.walletChainId);
  return ctx.wallet;
}

async function confirm(client: PublicClient, hash: Hex) {
  const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 180_000 });
  return receipt;
}

async function addActivity(
  ctx: ServiceContext,
  a: Omit<ActivityRecord, "kind" | "createdAt" | "txHashes"> & { txHashes?: Hex[] },
) {
  return ctx.vault.put({ kind: "activity", createdAt: now(), txHashes: [], ...a });
}

async function patchActivity(ctx: ServiceContext, id: string, patch: Partial<ActivityRecord>) {
  await ctx.vault.update(id, "activity", (cur) => ({ ...cur, ...patch }));
}

function noteFromExport(
  n: NoteExport,
  origin: NoteRecord["origin"],
  status: NoteRecord["status"],
  txHash?: Hex,
): NoteRecord {
  return {
    kind: "note",
    secret: n.secret,
    commitment: n.commitment,
    nullifier: n.nullifier,
    amountWei: n.amountWei,
    asset: getAddress(n.asset),
    status,
    origin,
    createdAt: now(),
    ...(txHash ? { txHash } : {}),
  };
}

async function isSpent(client: PublicClient, nullifier: Hex) {
  return client.readContract({
    address: POOL_ADDRESS,
    abi: POOL_STATE_READ_ABI,
    functionName: "isSpent",
    args: [nullifier],
  });
}

async function commitmentSeen(client: PublicClient, commitment: Hex) {
  return client.readContract({
    address: POOL_ADDRESS,
    abi: POOL_STATE_READ_ABI,
    functionName: "commitmentSeen",
    args: [commitment],
  });
}

/* --------------------------------------------------------------- deposits */

export async function addMoney(ctx: ServiceContext, asset: Address, amountWei: bigint): Promise<{ hash: Hex }> {
  const wallet = requireWallet(ctx);
  ctx.onStep?.("preparing");
  const prover = workerProver("shield");

  ctx.onStep?.("proving");
  const intent = await buildShieldBoundIntent({
    chainId: CHAIN_ID,
    poolAddress: POOL_ADDRESS,
    asset,
    amountWei,
    prover,
  });

  // The secret is the money: store it before anything is broadcast.
  const noteId = await ctx.vault.put({
    kind: "note",
    secret: intent.note.secret,
    commitment: intent.note.commitment,
    nullifier: intent.note.nullifier,
    amountWei: amountWei.toString(),
    asset: getAddress(asset),
    status: "pending",
    origin: "shield",
    createdAt: now(),
  });
  const activityId = await addActivity(ctx, {
    type: "added",
    amountWei: amountWei.toString(),
    asset: getAddress(asset),
    status: "pending",
  });

  try {
    if (!isNativeAsset(asset)) {
      const allowance = await ctx.client.readContract({
        address: asset,
        abi: erc20Abi,
        functionName: "allowance",
        args: [wallet.account.address, intent.exec.poolAddress],
      });
      if (allowance < amountWei) {
        ctx.onStep?.("approving");
        assertTestnet(ctx.walletChainId);
        const approveHash = await wallet.writeContract({
          chain: CHAIN,
          account: wallet.account,
          address: asset,
          abi: erc20Abi,
          functionName: "approve",
          args: [intent.exec.poolAddress, amountWei],
        });
        const r = await confirm(ctx.client, approveHash);
        if (r.status !== "success")
          throw new FlowError("The approval transaction failed. Nothing was added.", "reverted");
      }
    }

    ctx.onStep?.("wallet");
    assertTestnet(ctx.walletChainId);
    const hash = await wallet.writeContract({
      chain: CHAIN,
      account: wallet.account,
      address: intent.exec.poolAddress,
      abi: SHIELD_BOUND_ABI,
      functionName: "shieldBound",
      args: intent.exec.args as readonly [Address, bigint, Hex, Hex],
      value: intent.exec.valueWei,
    });
    await ctx.vault.update(noteId, "note", (n) => ({ ...n, txHash: hash }));
    await patchActivity(ctx, activityId, { txHashes: [hash] });

    ctx.onStep?.("confirming");
    const receipt = await confirm(ctx.client, hash);
    if (receipt.status !== "success") {
      await ctx.vault.update(noteId, "note", (n) => ({ ...n, status: "failed" }));
      await patchActivity(ctx, activityId, { status: "failed", error: "The transaction reverted." });
      throw new FlowError("The deposit transaction reverted on chain. Nothing was added.", "reverted");
    }
    await ctx.vault.update(noteId, "note", (n) => ({ ...n, status: "unspent" }));
    await patchActivity(ctx, activityId, { status: "confirmed" });
    ctx.onStep?.("done");
    return { hash };
  } catch (e) {
    const note = ctx.vault.get(noteId, "note");
    // Only a deposit that never reached the chain can be written off here.
    if (note && !note.txHash) {
      await ctx.vault.update(noteId, "note", (n) => ({ ...n, status: "failed" }));
      await patchActivity(ctx, activityId, {
        status: "failed",
        error: isUserRejection(e) ? "Cancelled in wallet." : "Not submitted.",
      });
    }
    throw e;
  }
}

/* --------------------------------------------------------- spend plumbing */

async function submitSpend(ctx: ServiceContext, intent: MirkIntent & { exec: IntentExec }): Promise<Hex> {
  try {
    ctx.onStep?.("submitting");
    return await relaySpend(intent);
  } catch (e) {
    if (!(e instanceof RelayUnavailableError)) throw e;
    if (["maybe_sent", "network"].includes(e.code)) throw e;
    if (!ctx.allowWalletSubmit || !ctx.wallet) {
      throw new FlowError(
        `${e.message} You can try again, or submit from your own wallet (your wallet address will then appear on this transaction).`,
        "relay-unavailable",
      );
    }
    const wallet = requireWallet(ctx);
    ctx.onStep?.("wallet");
    if (intent.exec.fn === "transfer") {
      return wallet.writeContract({
        chain: CHAIN,
        account: wallet.account,
        address: intent.exec.poolAddress,
        abi: POOL_TRANSFER_ABI,
        functionName: "transfer",
        args: transferCallArgs(intent as PrivateSendIntent),
      });
    }
    if (intent.exec.fn === "unshield") {
      return wallet.writeContract({
        chain: CHAIN,
        account: wallet.account,
        address: intent.exec.poolAddress,
        abi: UNSHIELD_ABI,
        functionName: "unshield",
        args: intent.exec.args as readonly [Hex, Hex, Hex, Address, Address, bigint],
      });
    }
    throw new Error(`Unsupported spend ${intent.exec.fn}`);
  }
}

async function postMemo(ctx: ServiceContext, paymentCommitment: Hex, memo: Hex): Promise<void> {
  try {
    await relayPaymentMemo(paymentCommitment, memo);
    return;
  } catch (e) {
    if (!(e instanceof RelayUnavailableError) || !ctx.allowWalletSubmit || !ctx.wallet) throw e;
  }
  const wallet = requireWallet(ctx);
  const hash = await wallet.writeContract({
    chain: CHAIN,
    account: wallet.account,
    address: PAY_MEMO_ADDRESS,
    abi: PAY_MEMO_ABI,
    functionName: "postMemo",
    args: [paymentCommitment, memo],
  });
  const r = await confirm(ctx.client, hash);
  if (r.status !== "success") throw new Error("The delivery message transaction reverted.");
}

/** Path for a note we own, after checking it is still unspent on chain. */
async function prepareSpend(ctx: ServiceContext, noteId: string) {
  const note = ctx.vault.get(noteId, "note");
  if (!note || note.status !== "unspent")
    throw new FlowError("That note is no longer available. Rescan and try again.", "not-ready");
  if (await isSpent(ctx.client, note.nullifier)) {
    await ctx.vault.update(noteId, "note", (n) => ({ ...n, status: "spent" }));
    throw new FlowError("Part of your balance was already spent. Your balance has been refreshed.", "not-ready");
  }
  ctx.onStep?.("syncing");
  const tree = await syncPoolTree(ctx.client);
  const path = await tree.pathForCommitment(note.commitment);
  if (!path)
    throw new FlowError("This money is still settling into the private pool. Try again in a moment.", "not-ready");
  return { note, path };
}

/**
 * After a submission failed or its outcome is unknown, ask the chain what
 * happened instead of guessing.
 */
async function settleUnknown(
  ctx: ServiceContext,
  sourceId: string,
  created: { id: string; commitment: Hex }[],
  definitelyFailed = false,
) {
  const source = ctx.vault.get(sourceId, "note");
  if (!source) return;
  const spent = await isSpent(ctx.client, source.nullifier).catch(() => null);
  if (spent === false && definitelyFailed) {
    await ctx.vault.update(sourceId, "note", (n) => ({ ...n, status: "unspent", spentBy: undefined }));
    for (const c of created) await ctx.vault.update(c.id, "note", (n) => ({ ...n, status: "failed" }));
  } else if (spent === true) {
    await ctx.vault.update(sourceId, "note", (n) => ({ ...n, status: "spent" }));
    for (const c of created) {
      const seen = await commitmentSeen(ctx.client, c.commitment).catch(() => false);
      await ctx.vault.update(c.id, "note", (n) => ({ ...n, status: seen ? "unspent" : "pending" }));
    }
  }
}

interface TransferOutcome {
  memoId?: string;
  hash: Hex;
  intent: PrivateSendIntent;
}

/**
 * One real private transfer out of one note. `keepPayment` stores the payment
 * note as our own (used for splits); otherwise only the change is ours.
 */
async function transferPart(
  ctx: ServiceContext,
  part: SpendPart,
  opts: { keepPayment: boolean; recipientTag?: string; activityId?: string },
): Promise<TransferOutcome> {
  const { note, path } = await prepareSpend(ctx, part.noteId);
  ctx.onStep?.("proving");
  const intent = await buildPrivateSendIntent({
    chainId: CHAIN_ID,
    poolAddress: POOL_ADDRESS,
    secretHex: note.secret,
    amountInWei: BigInt(note.amountWei),
    amountPayWei: part.amount,
    asset: note.asset,
    path,
    prove: workerProver("transfer"),
  });

  // Persist delivery ciphertext before any submission can leave this device.
  // A lost relay reply must not lose the recipient's only copy of the payment.
  let memoId: string | undefined;
  if (opts.recipientTag) {
    const pkg = encodeNotePackage({ pool: POOL_ADDRESS, ...intent.paymentNote });
    const memo = ticketToMemoBytes(await sealToReceiveTag(pkg, opts.recipientTag));
    memoId = await ctx.vault.put({
      kind: "pending-memo",
      paymentCommitment: intent.paymentNote.commitment,
      memo,
      activityId: opts.activityId,
      createdAt: now(),
    });
  }
  const created: { id: string; commitment: Hex }[] = [];
  if (BigInt(intent.changeNote.amountWei) > 0n) {
    created.push({
      id: await ctx.vault.put(noteFromExport(intent.changeNote, "change", "pending")),
      commitment: intent.changeNote.commitment,
    });
  }
  if (opts.keepPayment) {
    created.push({
      id: await ctx.vault.put(noteFromExport(intent.paymentNote, "split", "pending")),
      commitment: intent.paymentNote.commitment,
    });
  }
  await ctx.vault.update(part.noteId, "note", (n) => ({ ...n, status: "spending" }));

  let hash: Hex;
  try {
    hash = await submitSpend(ctx, intent);
  } catch (e) {
    await settleUnknown(
      ctx,
      part.noteId,
      created,
      !(e instanceof RelayUnavailableError && ["maybe_sent", "network"].includes(e.code)),
    );
    throw e;
  }
  await ctx.vault.update(part.noteId, "note", (n) => ({ ...n, spentBy: hash }));
  for (const c of created) await ctx.vault.update(c.id, "note", (n) => ({ ...n, txHash: hash }));

  ctx.onStep?.("confirming");
  const receipt = await confirm(ctx.client, hash).catch(() => null);
  if (!receipt) {
    await settleUnknown(ctx, part.noteId, created);
    throw new FlowError(
      "The transaction was submitted but not confirmed yet. Check Activity in a moment.",
      "not-ready",
    );
  }
  if (receipt.status !== "success") {
    await settleUnknown(ctx, part.noteId, created, true);
    throw new FlowError("The private transfer reverted on chain. Your balance is unchanged.", "reverted");
  }
  await ctx.vault.update(part.noteId, "note", (n) => ({ ...n, status: "spent" }));
  for (const c of created) await ctx.vault.update(c.id, "note", (n) => ({ ...n, status: "unspent" }));
  return { hash, intent, memoId };
}

function planFor(ctx: ServiceContext, asset: Address, amountWei: bigint): SpendPart[] {
  const notes = spendable(ctx.vault.list("note"), asset).map((n) => ({ id: n.id, amount: BigInt(n.value.amountWei) }));
  const sel = selectNotes(notes, amountWei);
  if (!sel.ok) {
    throw new FlowError(
      sel.reason === "insufficient"
        ? "Your private balance is not enough for this amount."
        : "This amount needs too many separate transfers. Send a smaller amount first.",
      "insufficient",
    );
  }
  return sel.parts;
}

export function previewParts(vault: PrivateVault, asset: Address, amountWei: bigint): number | null {
  const notes = spendable(vault.list("note"), asset).map((n) => ({ id: n.id, amount: BigInt(n.value.amountWei) }));
  const sel = selectNotes(notes, amountWei);
  return sel.ok ? sel.parts.length : null;
}

/* ---------------------------------------------------------- private sends */

export interface SendResult {
  hashes: Hex[];
  completedParts: number;
  totalParts: number;
}

/** Pay a Mirk receive tag privately: real transfer(s) plus an encrypted delivery message each. */
async function payTag(
  ctx: ServiceContext,
  tag: string,
  asset: Address,
  amountWei: bigint,
  type: Extract<ActivityType, "sent" | "claim-created">,
  detail?: string,
): Promise<SendResult & { activityId: string }> {
  const parts = planFor(ctx, asset, amountWei);
  const activityId = await addActivity(ctx, {
    type,
    amountWei: amountWei.toString(),
    asset: getAddress(asset),
    status: "pending",
    detail,
  });
  const hashes: Hex[] = [];
  try {
    for (let i = 0; i < parts.length; i++) {
      ctx.onStep?.("preparing", { part: i + 1, parts: parts.length });
      const { hash, intent, memoId } = await transferPart(ctx, parts[i]!, {
        keepPayment: false,
        recipientTag: tag,
        activityId,
      });
      hashes.push(hash);
      await patchActivity(ctx, activityId, {
        txHashes: [...hashes],
        status: i + 1 === parts.length ? "pending" : "partial",
      });

      ctx.onStep?.("delivering", { part: i + 1, parts: parts.length });
      const pendingMemo = memoId ? ctx.vault.get(memoId, "pending-memo") : null;
      if (!pendingMemo || !memoId) throw new Error("Payment delivery record missing.");
      try {
        await postMemo(ctx, intent.paymentNote.commitment, pendingMemo.memo);
        await ctx.vault.remove(memoId);
      } catch {
        // The money moved; only the delivery message is outstanding. Reconcile retries it.
        await patchActivity(ctx, activityId, { error: "Delivery message pending. Mirk will retry it." });
      }
    }
    await patchActivity(ctx, activityId, { status: "confirmed" });
    ctx.onStep?.("done");
    return { hashes, completedParts: parts.length, totalParts: parts.length, activityId };
  } catch (e) {
    await patchActivity(ctx, activityId, {
      status: hashes.length ? "partial" : "failed",
      error: hashes.length
        ? `${hashes.length} of ${parts.length} parts confirmed.`
        : isUserRejection(e)
          ? "Cancelled in wallet."
          : "Not sent.",
    });
    throw e;
  }
}

export async function sendToAccount(
  ctx: ServiceContext,
  account: AccountNumber,
  asset: Address,
  amountWei: bigint,
): Promise<SendResult> {
  if (!REGISTRY_ADDRESS)
    throw new FlowError("The account registry is not available on this deployment.", "no-registry");
  const tag = await resolveAccount(ctx.client, account);
  if (!tag) throw new FlowError("No Mirk account has this number.", "unknown-account");
  const own = ctx.vault.list("account")[0]?.value;
  if (own?.tag === tag) throw new FlowError("This is your own Mirk account number.", "unknown-account");
  const r = await payTag(ctx, tag, asset, amountWei, "sent", `To •••• ${formatAccountNumber(account).slice(-4)}`);
  return r;
}

/* -------------------------------------------------------------- claim links */

export async function createClaimLink(
  ctx: ServiceContext,
  asset: Address,
  amountWei: bigint,
  origin: string,
): Promise<{ link: string; claimId: string } & SendResult> {
  const key = await generateReceiveKey();
  const { x, y, d } = key.privateJwk;
  if (!x || !y || !d) throw new Error("Could not create a claim key.");
  const hint = await ctx.client.getBlockNumber({ cacheTime: 0 });
  const payload: ClaimPayload = { n: CHAIN_ID, p: POOL_ADDRESS, k: { x, y, d }, b: hint.toString() };
  const link = `${origin.replace(/\/+$/, "")}/claim#${await encodeClaimPackage(payload)}`;
  // Keep the link before money moves, so it can never be lost mid-flow.
  const claimId = await ctx.vault.put({
    kind: "claim",
    link,
    tag: key.tag,
    privateJwk: key.privateJwk,
    amountWei: amountWei.toString(),
    asset: getAddress(asset),
    status: "funding",
    createdAt: now(),
  });
  try {
    const r = await payTag(ctx, key.tag, asset, amountWei, "claim-created", "Claim link");
    await ctx.vault.update(claimId, "claim", (c) => ({ ...c, status: "open", txHash: r.hashes.at(-1) }));
    return { link, claimId, ...r };
  } catch (e) {
    const anyPaid = ctx.vault.get(claimId, "claim");
    if (anyPaid) await ctx.vault.update(claimId, "claim", (c) => ({ ...c, status: "failed" }));
    throw e;
  }
}

/* ---------------------------------------------------------------- cash out */

export async function cashOut(
  ctx: ServiceContext,
  to: Address,
  asset: Address,
  amountWei: bigint,
): Promise<SendResult> {
  const recipient = getAddress(to);
  const parts = planFor(ctx, asset, amountWei);
  const activityId = await addActivity(ctx, {
    type: "cashed-out",
    amountWei: amountWei.toString(),
    asset: getAddress(asset),
    status: "pending",
    detail: `To ${recipient.slice(0, 6)}…${recipient.slice(-4)}`,
  });
  const hashes: Hex[] = [];
  try {
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      ctx.onStep?.("preparing", { part: i + 1, parts: parts.length });
      let noteId = part.noteId;
      if (part.amount < part.amountIn) {
        // A cash out spends a whole note, so first split off exactly the amount, privately.
        const split = await transferPart(ctx, part, { keepPayment: true });
        hashes.push(split.hash);
        const splitNote = ctx.vault
          .list("note")
          .find((n) => n.value.commitment === split.intent.paymentNote.commitment);
        if (!splitNote) throw new Error("Split note missing from the private store.");
        noteId = splitNote.id;
      }
      const { note, path } = await prepareSpend(ctx, noteId);
      ctx.onStep?.("proving", { part: i + 1, parts: parts.length });
      const intent = await buildUnshieldIntent({
        chainId: CHAIN_ID,
        poolAddress: POOL_ADDRESS,
        secretHex: note.secret,
        amountWei: BigInt(note.amountWei),
        asset: note.asset,
        to: recipient,
        path,
        prove: workerProver("unshield"),
      });
      await ctx.vault.update(noteId, "note", (n) => ({ ...n, status: "spending" }));
      let hash: Hex;
      try {
        hash = await submitSpend(ctx, intent);
      } catch (e) {
        await settleUnknown(
          ctx,
          noteId,
          [],
          !(e instanceof RelayUnavailableError && ["maybe_sent", "network"].includes(e.code)),
        );
        throw e;
      }
      await ctx.vault.update(noteId, "note", (n) => ({ ...n, spentBy: hash }));
      ctx.onStep?.("confirming", { part: i + 1, parts: parts.length });
      const receipt = await confirm(ctx.client, hash).catch(() => null);
      if (!receipt || receipt.status !== "success") {
        await settleUnknown(ctx, noteId, [], Boolean(receipt));
        throw new FlowError(
          receipt
            ? "The cash out reverted on chain. Your balance is unchanged."
            : "The cash out was submitted but not confirmed yet.",
          receipt ? "reverted" : "not-ready",
        );
      }
      await ctx.vault.update(noteId, "note", (n) => ({ ...n, status: "spent" }));
      hashes.push(hash);
      await patchActivity(ctx, activityId, {
        txHashes: [...hashes],
        status: i + 1 === parts.length ? "confirmed" : "partial",
      });
    }
    ctx.onStep?.("done");
    return { hashes, completedParts: parts.length, totalParts: parts.length };
  } catch (e) {
    await patchActivity(ctx, activityId, {
      txHashes: [...hashes],
      status: hashes.length ? "partial" : "failed",
      error: isUserRejection(e)
        ? "Cancelled in wallet."
        : hashes.length
          ? "Not every part completed."
          : "Not cashed out.",
    });
    throw e;
  }
}

/* ------------------------------------------------- incoming payments, sweeps */

function sweepChain(client: PublicClient): SweepChain {
  return {
    isSpent: (n) => isSpent(client, n),
    isCommitmentSeen: (c) => commitmentSeen(client, c),
    pathForCommitment: async (c) => (await syncPoolTree(client)).pathForCommitment(c),
    waitForReceipt: async (hash) => {
      const r = await confirm(client, hash);
      return { status: r.status };
    },
  };
}

/** Move a received payment into a fresh note only we know. Credits only when final. */
export async function sweepIncoming(ctx: ServiceContext, incomingId: string): Promise<"swept" | "pending" | "lost"> {
  const rec = ctx.vault.get(incomingId, "incoming");
  if (!rec || rec.status === "swept" || rec.status === "lost") return rec?.status === "swept" ? "swept" : "lost";
  const exported = await notePackageToExport(decodeNotePackage(rec.notePackage));
  let freshId: string | null = null;
  const result = await sweepReceivedNote({
    note: exported,
    poolAddress: POOL_ADDRESS,
    chainId: CHAIN_ID,
    prove: workerProver("transfer"),
    chain: sweepChain(ctx.client),
    submit: (intent) => submitSpend(ctx, intent),
    beforeSubmit: async (fresh) => {
      freshId = await ctx.vault.put(noteFromExport(fresh, rec.source === "claim" ? "claim" : "received", "pending"));
      await ctx.vault.update(incomingId, "incoming", (r) => ({
        ...r,
        status: "sweeping",
        freshCommitment: fresh.commitment,
      }));
    },
  });

  if (result.final && result.status === "swept") {
    if (freshId)
      await ctx.vault.update(freshId, "note", (n) => ({ ...n, status: "unspent", txHash: result.hash ?? undefined }));
    await ctx.vault.update(incomingId, "incoming", (r) => ({
      ...r,
      status: "swept",
      sweepTx: result.hash ?? undefined,
    }));
    await addActivity(ctx, {
      type: rec.source === "claim" ? "claim-swept" : "received",
      amountWei: rec.amountWei,
      asset: rec.asset,
      status: "confirmed",
      txHashes: result.hash ? [result.hash] : [],
    });
    return "swept";
  }
  if (result.status === "already_spent") {
    if (freshId) await ctx.vault.update(freshId, "note", (n) => ({ ...n, status: "failed" }));
    await ctx.vault.update(incomingId, "incoming", (r) => ({ ...r, status: "lost" }));
    return "lost";
  }
  if (result.status === "unconfirmed" && freshId) {
    await ctx.vault.update(freshId, "note", (n) => ({ ...n, txHash: result.hash ?? undefined }));
    return "pending";
  }
  if (freshId) await ctx.vault.update(freshId, "note", (n) => ({ ...n, status: "failed" }));
  await ctx.vault.update(incomingId, "incoming", (r) => ({ ...r, status: "found" }));
  if (result.status === "failed" && result.reason) throw new Error(result.reason);
  return "pending";
}

async function scanFor(
  ctx: ServiceContext,
  receiveKey: ReceiveKeyJwk,
  source: IncomingRecord["source"],
  fromBlock?: bigint,
): Promise<{ found: StoredRecord<IncomingRecord>[]; scannedTo: bigint }> {
  const { payments, scannedTo } = await scanIncomingPayments({
    client: ctx.client,
    network: NETWORK,
    board: { address: PAY_MEMO_ADDRESS, deployBlock: MEMO_DEPLOY_BLOCK, emitsPoster: false },
    receiveKey,
    fromBlock,
    chunkSize: LOG_CHUNK_BLOCKS,
  });
  const known = new Set(ctx.vault.list("incoming").map((r) => r.value.commitment.toLowerCase()));
  for (const p of payments) {
    if (known.has(p.commitment.toLowerCase())) continue;
    await ctx.vault.put({
      kind: "incoming",
      commitment: p.commitment,
      nullifier: p.nullifier,
      amountWei: p.amountWei,
      asset: getAddress(p.asset),
      notePackage: encodeNotePackage(p.notePackage),
      status: "found",
      source,
      createdAt: now(),
    });
  }
  const commitments = new Set(payments.map((p) => p.commitment.toLowerCase()));
  return {
    found: ctx.vault.list("incoming").filter((r) => commitments.has(r.value.commitment.toLowerCase())),
    scannedTo,
  };
}

const SCAN_META = "inbox:scannedTo";

/** Scan the payment board for payments to this account, then secure each one. */
export async function checkInbox(ctx: ServiceContext): Promise<{ found: number; swept: number }> {
  const account = ctx.vault.list("account")[0]?.value;
  if (!account) return { found: 0, swept: 0 };
  const last = await ctx.vault.getMeta(SCAN_META);
  const { found, scannedTo } = await scanFor(ctx, account.privateJwk, "account", last ? BigInt(last) + 1n : undefined);
  await ctx.vault.setMeta(SCAN_META, scannedTo.toString());
  let swept = 0;
  const open = ctx.vault.list("incoming").filter((r) => r.value.source === "account" && r.value.status === "found");
  for (const r of open) {
    if ((await sweepIncoming(ctx, r.id)) === "swept") swept++;
  }
  return { found: found.length, swept };
}

export type ClaimOutcome =
  | { status: "claimed"; amountWei: bigint; asset: Address; parts: number }
  | { status: "nothing-found" }
  | { status: "pending" }
  | { status: "taken" };

/** Read-only look at a claim link's unclaimed payments. Writes nothing. */
export async function previewClaim(
  client: PublicClient,
  payload: ClaimPayload,
): Promise<{ asset: Address; amountWei: bigint }[]> {
  if (payload.n !== CHAIN_ID || payload.p.toLowerCase() !== POOL_ADDRESS.toLowerCase())
    throw new Error("This claim link is for a different network or pool.");
  const { payments } = await scanIncomingPayments({
    client,
    network: NETWORK,
    board: { address: PAY_MEMO_ADDRESS, deployBlock: MEMO_DEPLOY_BLOCK, emitsPoster: false },
    receiveKey: claimKeyJwk(payload),
    fromBlock: BigInt(payload.b),
    chunkSize: LOG_CHUNK_BLOCKS,
  });
  const byAsset = new Map<string, bigint>();
  for (const p of payments)
    byAsset.set(getAddress(p.asset), (byAsset.get(getAddress(p.asset)) ?? 0n) + BigInt(p.amountWei));
  return Array.from(byAsset, ([asset, amountWei]) => ({ asset: asset as Address, amountWei }));
}

/** Find the payment(s) behind a claim link and sweep them into this store. */
export async function claimFromLink(ctx: ServiceContext, payload: ClaimPayload): Promise<ClaimOutcome> {
  if (payload.n !== CHAIN_ID || payload.p.toLowerCase() !== POOL_ADDRESS.toLowerCase())
    throw new Error("This claim link is for a different network or pool.");
  const { found } = await scanFor(ctx, claimKeyJwk(payload), "claim", BigInt(payload.b));
  const open = found.filter((r) => r.value.status === "found" || r.value.status === "sweeping");
  if (open.length === 0) return { status: "nothing-found" };
  let total = 0n;
  let parts = 0;
  let pending = false;
  let lost = false;
  for (const r of open) {
    const s = await sweepIncoming(ctx, r.id);
    if (s === "swept") {
      total += BigInt(r.value.amountWei);
      parts++;
    } else if (s === "pending") pending = true;
    else lost = true;
  }
  if (parts > 0) return { status: "claimed", amountWei: total, asset: open[0]!.value.asset as Address, parts };
  if (pending) return { status: "pending" };
  return lost ? { status: "taken" } : { status: "nothing-found" };
}

/* ---------------------------------------------------------------- accounts */

export async function ensureAccount(vault: PrivateVault, client: PublicClient): Promise<StoredRecord<AccountRecord>> {
  const existing = vault.list("account")[0];
  if (existing) return existing;
  const key = await generateReceiveKey();
  let number = generateAccountNumber();
  if (REGISTRY_ADDRESS) {
    for (let i = 0; i < 5; i++) {
      const taken = await client.readContract({
        address: REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: "isRegistered",
        args: [BigInt(number)],
      });
      if (!taken) break;
      number = generateAccountNumber();
    }
  }
  const id = await vault.put({
    kind: "account",
    number,
    tag: key.tag,
    privateJwk: key.privateJwk,
    status: "unregistered",
    createdAt: now(),
  });
  return { id, value: vault.get(id, "account")! };
}

/** Ask the registrar to publish this account number on chain. */
export async function registerAccount(vault: PrivateVault, client: PublicClient): Promise<AccountRecord> {
  const acct = await ensureAccount(vault, client);
  if (acct.value.status === "active") return acct.value;
  const onchain = await syncAccountStatus(vault, client);
  if (onchain?.status === "active") return onchain;

  const res = await fetch("/api/accounts/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ accountNumber: acct.value.number, receiveTag: acct.value.tag }),
    credentials: "omit",
  });
  const json = (await res.json().catch(() => ({}))) as { hash?: Hex; error?: string; code?: string };
  if (res.status === 409 && json.code === "number-taken") {
    // Someone registered this number first: pick a new one and retry once.
    await vault.update(acct.id, "account", (a) => ({ ...a, number: generateAccountNumber(), status: "unregistered" }));
    return registerAccount(vault, client);
  }
  if (!res.ok || !json.hash) throw new Error(json.error ?? "Registration is unavailable right now.");
  return vault.update(acct.id, "account", (a) => ({ ...a, status: "pending", txHash: json.hash }));
}

/** Check the registry and mark the account active once its mapping is on chain. */
export async function syncAccountStatus(vault: PrivateVault, client: PublicClient): Promise<AccountRecord | null> {
  const acct = vault.list("account")[0];
  if (!acct || !REGISTRY_ADDRESS) return acct?.value ?? null;
  if (acct.value.status === "active") return acct.value;
  const tag = await resolveAccount(client, acct.value.number as AccountNumber).catch(() => null);
  if (tag === acct.value.tag) return vault.update(acct.id, "account", (a) => ({ ...a, status: "active" }));
  if (tag && tag !== acct.value.tag) {
    // Number collision: choose another and register again.
    return vault.update(acct.id, "account", (a) => ({
      ...a,
      number: generateAccountNumber(),
      status: "unregistered",
      txHash: undefined,
    }));
  }
  if (acct.value.status === "pending" && acct.value.txHash) {
    const r = await client.getTransactionReceipt({ hash: acct.value.txHash }).catch(() => null);
    if (r && r.status !== "success")
      return vault.update(acct.id, "account", (a) => ({ ...a, status: "unregistered", txHash: undefined }));
  }
  return acct.value;
}

/* --------------------------------------------------------------- reconcile */

/** Bring every in-flight record in line with chain state, after a reload or on demand. */
export async function reconcile(ctx: ServiceContext): Promise<void> {
  for (const n of ctx.vault.list("note")) {
    const v = n.value;
    if (v.status === "pending") {
      if (await commitmentSeen(ctx.client, v.commitment)) {
        const spent = await isSpent(ctx.client, v.nullifier);
        await ctx.vault.update(n.id, "note", (x) => ({ ...x, status: spent ? "spent" : "unspent" }));
      } else if (v.txHash) {
        const r = await ctx.client.getTransactionReceipt({ hash: v.txHash }).catch(() => null);
        if (r && r.status !== "success") await ctx.vault.update(n.id, "note", (x) => ({ ...x, status: "failed" }));
      }
    } else if (v.status === "spending" || v.status === "unspent") {
      const spent = await isSpent(ctx.client, v.nullifier);
      if (spent) await ctx.vault.update(n.id, "note", (x) => ({ ...x, status: "spent" }));
      else if (v.status === "spending" && v.spentBy) {
        const r = v.spentBy ? await ctx.client.getTransactionReceipt({ hash: v.spentBy }).catch(() => null) : null;
        if (r && r.status !== "success")
          await ctx.vault.update(n.id, "note", (x) => ({ ...x, status: "unspent", spentBy: undefined }));
      }
    }
  }

  for (const m of ctx.vault.list("pending-memo")) {
    try {
      await postMemo(ctx, m.value.paymentCommitment, m.value.memo);
      await ctx.vault.remove(m.id);
      if (m.value.activityId && ctx.vault.get(m.value.activityId, "activity")) {
        await patchActivity(ctx, m.value.activityId, { error: undefined });
      }
    } catch {
      // Try again on the next reconcile.
    }
  }

  for (const i of ctx.vault.list("incoming")) {
    if (i.value.status !== "sweeping") continue;
    const freshCommitment = i.value.freshCommitment?.toLowerCase();
    const fresh = freshCommitment
      ? ctx.vault.list("note").find((n) => n.value.commitment.toLowerCase() === freshCommitment)
      : undefined;
    if (fresh && (await commitmentSeen(ctx.client, fresh.value.commitment))) {
      await ctx.vault.update(fresh.id, "note", (x) => ({ ...x, status: "unspent" }));
      await ctx.vault.update(i.id, "incoming", (x) => ({ ...x, status: "swept" }));
      await addActivity(ctx, {
        type: i.value.source === "claim" ? "claim-swept" : "received",
        amountWei: i.value.amountWei,
        asset: i.value.asset,
        status: "confirmed",
      });
    } else if (await isSpent(ctx.client, i.value.nullifier)) {
      // Spent, but not into our fresh note: the payer took it back first.
      if (fresh) await ctx.vault.update(fresh.id, "note", (x) => ({ ...x, status: "failed" }));
      await ctx.vault.update(i.id, "incoming", (x) => ({ ...x, status: "lost" }));
    } else if (fresh?.value.txHash) {
      const receipt = await ctx.client.getTransactionReceipt({ hash: fresh.value.txHash }).catch(() => null);
      if (receipt?.status === "reverted") {
        await ctx.vault.update(fresh.id, "note", (x) => ({ ...x, status: "failed" }));
        await ctx.vault.update(i.id, "incoming", (x) => ({ ...x, status: "found" }));
      }
    }
  }
}

export type { ClaimRecord };
