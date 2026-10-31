// Derived from @gloamtrade/sdk 0.2.2 (MIT). Copyright (c) 2026 Gloam.
// Maintained by Mirk; see THIRD_PARTY_NOTICES.md.
/**
 * Payee side: find the payments sent to your Mirk address, and read their notes.
 *
 * When someone pays a Mirk address (mirkr1.…), their app seals the payment
 * (mirkt1.…) so only that address's key opens it. Where the network has a
 * payment-message board (MirkPayMemo), the sealed payment is posted there
 * next to the payment's commitment, and the payee finds it by scanning the
 * board: scanIncomingPayments. Where there is no board, the payer hands the
 * sealed code over directly, and openIncomingPayment checks it.
 *
 * Anyone who knows your Mirk address can post a message to it, so a payment
 * only counts when its code opens the commitment the message names, and that
 * note is in the vault and not yet spent, both read at one pinned block (the
 * same rule the Mirk app's inbox uses). A payment is not yours until you
 * secure it: the payer made its secret and could still spend it back. Move it
 * into a fresh note only you know with sweepReceivedNote before you credit
 * anything.
 */

import type { Address, Hex, PublicClient } from "viem";
import { networkName, type MirkNetwork } from "./constants";
import { noteCommitmentPoseidon, noteNullifierPoseidon } from "./note";
import { fieldToHex, getPoseidon, hexToField } from "./poseidon";
import {
  decodeNotePackage,
  isSealedTicket,
  openSealedTicket,
  type NotePackage,
  type ReceiveKey,
  type ReceiveKeyJwk,
} from "./receiveTag";
import { POOL_STATE_ABI } from "./sweep";

/** A payment-message board: where payers post sealed payments for their payees to find. */
export interface PayMemoBoard {
  address: Address;
  /** Block the board was deployed at (scans start here, or at the pool's deploy block if later). */
  deployBlock: bigint;
  /** The first testnet board also indexed the poster's address; boards since emit only commitment and memo. */
  emitsPoster: boolean;
}

/**
 * No payment-message board is configured in this SDK build. Payments to a
 * Mirk address are handed over as a sealed code (openIncomingPayment).
 */
export function payMemoBoardFor(chainId: number): PayMemoBoard | null {
  networkName(chainId);
  return null;
}

/** Thrown when a network has no payment-message board to scan. */
export class NoPayMemoBoardError extends Error {
  constructor(chainId: number) {
    super(
      `${networkName(chainId)} has no payment-message board, so payments to a Mirk address are not posted on chain there. Ask the payer for the sealed code (mirkt1.…) and check it with openIncomingPayment.`,
    );
    this.name = "NoPayMemoBoardError";
  }
}

/** A payment sent to your Mirk address: in the vault and not yet spent at `checkedAt`. */
export interface IncomingPayment {
  /** The payment's commitment in the vault. */
  commitment: Hex;
  /** Spent once the payment is secured (or taken back by the payer). */
  nullifier: Hex;
  amountWei: string;
  asset: Address;
  /** The payer's private note (an agent ID, an invoice number), or null. */
  note: string | null;
  /** The sealed code (mirkt1.…). It is the money until secured: store it safely. */
  sealedTicket: string;
  /** The opened payment. Pass notePackageToExport(notePackage) to sweepReceivedNote to secure it. */
  notePackage: NotePackage;
  /** Where the board posted it (null for a code handed over directly). */
  blockNumber: bigint | null;
  txHash: Hex | null;
}

export interface ScanIncomingParams {
  client: PublicClient;
  /** The supported Mirk network. */
  network: MirkNetwork;
  /** Your receive key (the one behind your mirkr1. address). Keep it server-side. */
  receiveKey: ReceiveKey | ReceiveKeyJwk;
  /** First block to scan. Default: where the board (or the pool, if later) was deployed. Pass the last scannedTo + 1 to resume. */
  fromBlock?: bigint;
  /** Last block to scan, and the block every check is read at. Default: the latest block. */
  toBlock?: bigint;
  /** Scan this board instead of the network's own (for a board this SDK version does not know yet). */
  board?: PayMemoBoard;
  /** Blocks per getLogs request. Default 100_000 (Tempo's cap); a range the node refuses is split. */
  chunkSize?: bigint;
}

export interface ScanIncomingResult {
  /** Payments to you, oldest first. Already-secured and taken-back ones are left out. */
  payments: IncomingPayment[];
  /** The block everything was read at. Resume the next scan from scannedTo + 1. */
  scannedTo: bigint;
}

const PAYMENT_MEMO_EVENT = {
  type: "event",
  name: "PaymentMemo",
  inputs: [
    { name: "paymentCommitment", type: "bytes32", indexed: true },
    { name: "memo", type: "bytes", indexed: false },
  ],
} as const;

const PAYMENT_MEMO_EVENT_WITH_POSTER = {
  type: "event",
  name: "PaymentMemo",
  inputs: [
    { name: "paymentCommitment", type: "bytes32", indexed: true },
    { name: "poster", type: "address", indexed: true },
    { name: "memo", type: "bytes", indexed: false },
  ],
} as const;

/** The node refusing a span as too wide or too big (Robinhood Chain refuses over 10,000 logs; Tempo over 100,000 blocks). */
const RANGE_ERROR =
  /block range|range (is )?too|exceeds? (the )?max|max(imum)? block|only \d+ are allowed|more than \d+ (results|logs)|too many (results|logs)|response size|query timeout|limit exceeded|exceeds limit of \d+|logs matched by query/i;

function errText(e: unknown): string {
  if (e && typeof e === "object") {
    const o = e as { details?: unknown; shortMessage?: unknown; message?: unknown };
    return String(o.details ?? o.shortMessage ?? o.message ?? e);
  }
  return String(e);
}

type MemoLog = {
  args: { paymentCommitment?: Hex; memo?: Hex };
  blockNumber: bigint | null;
  transactionHash: Hex | null;
};

async function memoLogs(
  client: PublicClient,
  board: PayMemoBoard,
  from: bigint,
  to: bigint,
  depth = 0,
): Promise<MemoLog[]> {
  try {
    return (await client.getLogs({
      address: board.address,
      event: (board.emitsPoster ? PAYMENT_MEMO_EVENT_WITH_POSTER : PAYMENT_MEMO_EVENT) as never,
      fromBlock: from,
      toBlock: to,
    })) as unknown as MemoLog[];
  } catch (e) {
    if (!RANGE_ERROR.test(errText(e)) || to <= from || depth >= 12) throw e;
    const mid = from + (to - from) / 2n;
    return [
      ...(await memoLogs(client, board, from, mid, depth + 1)),
      ...(await memoLogs(client, board, mid + 1n, to, depth + 1)),
    ];
  }
}

function memoText(memo: Hex): string {
  const hex = memo.startsWith("0x") ? memo.slice(2) : memo;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return new TextDecoder().decode(bytes);
}

/** Opens a sealed code with the key and checks it is a real payment for `commitment` (when given). Null if it is not for this key. */
async function openForKey(
  sealed: string,
  key: ReceiveKey | ReceiveKeyJwk,
  network: MirkNetwork,
  commitment?: Hex,
): Promise<{ pack: NotePackage; commitment: Hex; nullifier: Hex } | null> {
  if (!isSealedTicket(sealed)) return null;
  let pack: NotePackage;
  try {
    pack = decodeNotePackage(await openSealedTicket(sealed, key));
  } catch {
    return null; // sealed to someone else, or not a payment
  }
  if (pack.pool && pack.pool.toLowerCase() !== network.pool.toLowerCase()) return null;
  // The code must open the commitment it names: Poseidon(secret, amount, asset).
  const real = fieldToHex(await noteCommitmentPoseidon(hexToField(pack.secret), BigInt(pack.amountWei), pack.asset));
  if (real.toLowerCase() !== pack.commitment.toLowerCase()) return null;
  if (commitment && real.toLowerCase() !== commitment.toLowerCase()) return null;
  const nullifier = fieldToHex(await noteNullifierPoseidon(hexToField(pack.secret), hexToField(real)));
  return { pack, commitment: real, nullifier };
}

async function stateAt(client: PublicClient, pool: Address, commitment: Hex, nullifier: Hex, blockNumber: bigint) {
  const [inVault, spent] = await Promise.all([
    client.readContract({
      address: pool,
      abi: POOL_STATE_ABI,
      functionName: "commitmentSeen",
      args: [commitment],
      blockNumber,
    }),
    client.readContract({
      address: pool,
      abi: POOL_STATE_ABI,
      functionName: "isSpent",
      args: [nullifier],
      blockNumber,
    }),
  ]);
  return { inVault, spent };
}

/**
 * Scan the network's payment-message board for payments sealed to your key.
 * Throws NoPayMemoBoardError where the network has no board, and passes a failed chain read on rather than skip
 * a payment, so a server can retry the same range later.
 */
export async function scanIncomingPayments(params: ScanIncomingParams): Promise<ScanIncomingResult> {
  const { client, network, receiveKey } = params;
  const board = params.board ?? payMemoBoardFor(network.chainId);
  if (!board) throw new NoPayMemoBoardError(network.chainId);

  const scannedTo = params.toBlock ?? (await client.getBlockNumber({ cacheTime: 0 }));
  // A message from before the board or the pool existed cannot be for one of its notes.
  const floor = board.deployBlock > network.deployBlock ? board.deployBlock : network.deployBlock;
  const from = params.fromBlock !== undefined && params.fromBlock > floor ? params.fromBlock : floor;
  if (from > scannedTo) return { payments: [], scannedTo };

  const chunk = params.chunkSize ?? 100_000n;
  const logs: MemoLog[] = [];
  for (let start = from; start <= scannedTo; start += chunk) {
    const end = start + chunk - 1n > scannedTo ? scannedTo : start + chunk - 1n;
    logs.push(...(await memoLogs(client, board, start, end)));
  }

  const payments: IncomingPayment[] = [];
  const seen = new Set<string>();
  // Load the hash up front, so a failure to load it is passed on (and the range
  // retried) instead of every message reading as a bad code below.
  if (logs.length) await getPoseidon();
  for (const log of logs) {
    const { paymentCommitment, memo } = log.args;
    if (!paymentCommitment || !memo) continue;
    let sealed: string;
    try {
      sealed = memoText(memo).trim();
    } catch {
      continue;
    }
    // Anyone can post to the board: one malformed code must not stop the scan.
    const opened = await openForKey(sealed, receiveKey, network, paymentCommitment).catch(() => null);
    if (!opened || seen.has(opened.commitment.toLowerCase())) continue;
    const { inVault, spent } = await stateAt(client, network.pool, opened.commitment, opened.nullifier, scannedTo);
    if (!inVault || spent) continue;
    seen.add(opened.commitment.toLowerCase());
    payments.push({
      commitment: opened.commitment,
      nullifier: opened.nullifier,
      amountWei: opened.pack.amountWei,
      asset: opened.pack.asset,
      note: opened.pack.note ?? null,
      sealedTicket: sealed,
      notePackage: opened.pack,
      blockNumber: log.blockNumber ?? null,
      txHash: log.transactionHash ?? null,
    });
  }
  return { payments, scannedTo };
}

export type IncomingCheck =
  | { status: "ready"; payment: IncomingPayment; checkedAt: bigint }
  /** The payer's transfer has not landed yet: check again shortly. */
  | { status: "not_in_vault_yet"; payment: IncomingPayment; checkedAt: bigint }
  /** Already secured, or spent back by the payer: nothing to credit. */
  | { status: "already_spent"; payment: IncomingPayment; checkedAt: bigint };

/**
 * Check a sealed code (mirkt1.…) the payer handed over directly, for networks
 * with no payment-message board. Throws if the code is not a payment sealed to
 * this key on this network's vault; otherwise says whether it is ready to
 * secure, not in the vault yet, or already spent.
 */
export async function openIncomingPayment(params: {
  client: PublicClient;
  network: MirkNetwork;
  receiveKey: ReceiveKey | ReceiveKeyJwk;
  sealedTicket: string;
  /** Block to read at. Default: the latest block. */
  blockNumber?: bigint;
}): Promise<IncomingCheck> {
  const sealed = params.sealedTicket.trim();
  const opened = await openForKey(sealed, params.receiveKey, params.network);
  if (!opened) {
    throw new Error("This code is not a Mirk payment sealed to this receive key on this network's vault.");
  }
  const checkedAt = params.blockNumber ?? (await params.client.getBlockNumber({ cacheTime: 0 }));
  const { inVault, spent } = await stateAt(
    params.client,
    params.network.pool,
    opened.commitment,
    opened.nullifier,
    checkedAt,
  );
  const payment: IncomingPayment = {
    commitment: opened.commitment,
    nullifier: opened.nullifier,
    amountWei: opened.pack.amountWei,
    asset: opened.pack.asset,
    note: opened.pack.note ?? null,
    sealedTicket: sealed,
    notePackage: opened.pack,
    blockNumber: null,
    txHash: null,
  };
  if (spent) return { status: "already_spent", payment, checkedAt };
  if (!inVault) return { status: "not_in_vault_yet", payment, checkedAt };
  return { status: "ready", payment, checkedAt };
}
