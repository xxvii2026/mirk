// Derived from @gloamtrade/sdk 0.2.2 (MIT). Copyright (c) 2026 Gloam.
// Maintained by Mirk; see THIRD_PARTY_NOTICES.md.
/**
 * Intent builders. Each returns an unsigned MirkIntent an app or agent can
 * inspect, then sign and broadcast. The plan layer is portable; the exec layer
 * is the resolved on-chain call.
 *
 * shieldBound (live deposit), unshield (cash out), and private_send (in-vault
 * transfer) each build a witness, generate a Groth16 proof via the injected
 * prover, and resolve to a signed-ready call. private_trade (sealedSwap) builds
 * a valid intent too, but its on-chain path is disabled pending the H1 solvency
 * work — the builder is here so integrators can wire it ahead of that flip.
 *
 * Network: builders accept `chainId` and `poolAddress`; only Robinhood Chain
 * testnet (46630) is currently supported. The caller must pass the configured
 * pool address. Unsupported chains fail closed. Prove with the artifact keys
 * built for the same chain.
 */

import type { Address } from "viem";
import {
  NATIVE_ASSET,
  RH_TESTNET_CHAIN_ID,
  assertDepositAllowed,
  isMainnetChainId,
  networkName,
  poolForChainId,
} from "./constants";
import { makeBoundNotePoseidon, type BoundNote } from "./note";
import type { MirkIntent, IntentExec } from "./intents";
import type { PoseidonMerklePath } from "./merkle";
import { fieldToBytes32 } from "./proof";
import type { Prover } from "./prove";
import { toField } from "./poseidon";
import { buildPoseidonUnshieldWitness, buildTransferWitness, type NoteExport } from "./witness";

const isNativeAsset = (a: Address) => a.toLowerCase() === NATIVE_ASSET.toLowerCase();

export interface ShieldIntentParams {
  /** Amount to shield, in wei (native) or token base units. */
  amountWei: bigint;
  /** Asset address. Defaults to native ETH (zero address). */
  asset?: Address;
  /** Chain to deposit on. Defaults to Robinhood Chain testnet (46630). */
  chainId?: number;
  /** Pool to deposit into. Defaults to Mirk's pool on `chainId`. */
  poolAddress?: Address;
  agentAddress?: Address | null;
}

export interface ShieldIntent extends MirkIntent<"shield"> {
  /** The freshly minted note. The caller MUST persist `note.secret` to spend later. */
  note: BoundNote;
  /** Builders always resolve the call, so `exec` is guaranteed here. */
  exec: IntentExec;
}

export interface ShieldBoundIntentParams extends ShieldIntentParams {
  /**
   * Injected shield prover bound to the shield circuit artifacts
   * (artifactProver({ wasm, zkey })). Required because the hardened pool enforces
   * a proof at deposit.
   */
  prover: Prover;
}

/**
 * Build a hardened shield intent for a pool whose shieldVerifier is set (audit
 * C1). Mints the note AND generates the shield proof binding the commitment to
 * (amount, asset), then resolves shieldBound(asset, amount, commitment, proof).
 * Use this on the Mirk testnet pool, which requires a shield proof. The asset
 * must be supported by the pool and the amount must fit the circuit's 128-bit
 * range; these checks run before any proof is made.
 */
export async function buildShieldBoundIntent(params: ShieldBoundIntentParams): Promise<ShieldIntent> {
  if (params.amountWei <= 0n) throw new Error("amountWei must be positive");
  const chainId = params.chainId ?? RH_TESTNET_CHAIN_ID;
  const asset = params.asset ?? NATIVE_ASSET;
  const isNative = isNativeAsset(asset);
  const poolAddress = params.poolAddress ?? poolForChainId(chainId);
  assertDepositAllowed(chainId, asset, params.amountWei);
  const note = await makeBoundNotePoseidon(params.amountWei, asset);
  const { proofBytes } = await params.prover({
    commitment: note.commitmentField.toString(),
    amount: params.amountWei.toString(),
    asset: toField(BigInt(asset)).toString(),
    secret: note.secretField.toString(),
  });

  return {
    intent: "shield",
    chainId,
    agentAddress: params.agentAddress ?? null,
    plan: {
      asset: isNative ? "ETH" : asset,
      amountWei: params.amountWei,
    },
    privacy:
      "Shielding is a public deposit: the amount and asset are visible on-chain. The note commitment hides who can later spend it, so future private sends and trades are unlinkable to this deposit.",
    execution: `Unsigned. Sign and broadcast shieldBound(asset, amount, commitment, proof) on ${networkName(chainId)}${
      isNative ? "; attach msg.value for native ETH" : ", after approving the pool to pull the token"
    }. Persist note.secret to spend later.`,
    exec: {
      poolAddress,
      fn: "shieldBound",
      valueWei: isNative ? params.amountWei : 0n,
      args: [asset, params.amountWei, note.commitment, proofBytes],
    },
    note,
  };
}

// ── unshield (cash out) ───────────────────────────────────────────────────────

export interface UnshieldIntentParams {
  secretHex: `0x${string}`;
  amountWei: bigint;
  asset?: Address;
  to: Address;
  path: PoseidonMerklePath;
  prove: Prover;
  poolAddress?: Address;
  chainId?: number;
  agentAddress?: Address | null;
}

/** Build a signed-ready unshield intent. exec.args match unshield(proof, root, nullifier, asset, to, amount). */
export async function buildUnshieldIntent(
  params: UnshieldIntentParams,
): Promise<MirkIntent<"unshield"> & { exec: IntentExec }> {
  const asset = params.asset ?? NATIVE_ASSET;
  const chainId = params.chainId ?? RH_TESTNET_CHAIN_ID;
  const poolAddress = params.poolAddress ?? poolForChainId(chainId);
  // A cash out to the vault itself strands the money there.
  if (params.to.toLowerCase() === poolAddress.toLowerCase()) {
    throw new Error("That address is the vault itself. Cash out to a wallet you control.");
  }
  const w = await buildPoseidonUnshieldWitness({
    secretHex: params.secretHex,
    amount: params.amountWei,
    asset,
    to: params.to,
    path: params.path,
  });
  if (!w.readyToProve) throw new Error(w.blocker ?? "unshield witness not ready");
  const { proofBytes } = await params.prove(w.circomInput);

  return {
    intent: "unshield",
    chainId,
    agentAddress: params.agentAddress ?? null,
    plan: { asset: isNativeAsset(asset) ? "ETH" : asset, amountWei: params.amountWei, to: params.to },
    privacy:
      "Unshield is the public exit: the amount, asset, and recipient become visible. The nullifier keeps the source note unlinkable to your other activity.",
    execution: `Unsigned. Sign and broadcast unshield(proof, root, nullifier, asset, to, amount) on ${networkName(chainId)}.${
      isMainnetChainId(chainId)
        ? " The pool keeps its cash-out fee (0.25% at launch, see cashOutFee) and sends the rest to the recipient."
        : ""
    }`,
    exec: {
      poolAddress,
      fn: "unshield",
      valueWei: 0n,
      args: [
        proofBytes,
        fieldToBytes32(w.publicInputs.root),
        fieldToBytes32(w.publicInputs.nullifier),
        asset,
        params.to,
        params.amountWei,
      ],
    },
  };
}

// ── private send (transfer) ───────────────────────────────────────────────────

export interface PrivateSendIntentParams {
  secretHex: `0x${string}`;
  amountInWei: bigint;
  amountPayWei: bigint;
  asset?: Address;
  path: PoseidonMerklePath;
  prove: Prover;
  poolAddress?: Address;
  chainId?: number;
  agentAddress?: Address | null;
}

export interface PrivateSendIntent extends MirkIntent<"private_send"> {
  /** Payment note to hand the recipient; change note stays with the sender. */
  paymentNote: NoteExport;
  changeNote: NoteExport;
  exec: IntentExec;
}

/** Build a signed-ready private-send intent. exec.args match transfer(proof, root, nullifier, [c0, c1]). */
export async function buildPrivateSendIntent(params: PrivateSendIntentParams): Promise<PrivateSendIntent> {
  const asset = params.asset ?? NATIVE_ASSET;
  const chainId = params.chainId ?? RH_TESTNET_CHAIN_ID;
  const poolAddress = params.poolAddress ?? poolForChainId(chainId);
  const w = await buildTransferWitness({
    secretHex: params.secretHex,
    amountIn: params.amountInWei,
    amountPay: params.amountPayWei,
    asset,
    path: params.path,
  });
  if (w.blocker) throw new Error(w.blocker);
  const { proofBytes } = await params.prove(w.circomInput);

  return {
    intent: "private_send",
    chainId,
    agentAddress: params.agentAddress ?? null,
    plan: { asset: isNativeAsset(asset) ? "ETH" : asset, amountWei: params.amountPayWei },
    privacy:
      "Private send stays inside the vault: no public transfer, no visible amount. The recipient opens the payment note; the change note stays with you.",
    execution: `Unsigned. Sign and broadcast transfer(proof, root, nullifier, [c0, c1]) on ${networkName(chainId)}, then hand the payment note to the recipient (or post it via MirkPayMemo where the network has one).`,
    exec: {
      poolAddress,
      fn: "transfer",
      valueWei: 0n,
      args: [
        proofBytes,
        fieldToBytes32(w.publicInputs.root),
        fieldToBytes32(w.publicInputs.nullifier),
        [fieldToBytes32(w.publicInputs.newCommitment0), fieldToBytes32(w.publicInputs.newCommitment1)],
      ],
    },
    paymentNote: w.paymentNote,
    changeNote: w.changeNote,
  };
}
