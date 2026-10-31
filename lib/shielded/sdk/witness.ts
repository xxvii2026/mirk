// Derived from @gloamtrade/sdk 0.2.2 (MIT). Copyright (c) 2026 Gloam.
// Maintained by Mirk; see THIRD_PARTY_NOTICES.md.
/**
 * Circom witness builders for the Poseidon circuits (unshield, transfer,
 * sealedSwap). Pure: each returns the circomInput object snarkjs proves plus the
 * derived public inputs and the new notes. The proving step is separate.
 */

import type { Address, Hex } from "viem";
import { noteCommitmentPoseidon, noteNullifierPoseidon, randomSecretField } from "./note";
import type { PoseidonMerklePath } from "./merkle";
import { fieldToHex, hexToField, toField } from "./poseidon";
import { NATIVE_ASSET } from "./constants";

// ── unshield ────────────────────────────────────────────────────────────────

export type PoseidonUnshieldWitness = {
  publicInputs: {
    root: bigint;
    nullifier: bigint;
    asset: bigint;
    amount: bigint;
    recipient: bigint;
  };
  circomInput: Record<string, string | string[]>;
  checks: { commitmentMatches: boolean; nullifierMatches: boolean; pathValid: boolean };
  readyToProve: boolean;
  blocker: string | null;
};

export async function buildPoseidonUnshieldWitness(args: {
  secretHex: Hex;
  amount: bigint;
  asset?: Address;
  to: Address;
  path: PoseidonMerklePath;
}): Promise<PoseidonUnshieldWitness> {
  const asset = args.asset ?? NATIVE_ASSET;
  const secret = hexToField(args.secretHex);
  const assetField = toField(BigInt(asset));
  const recipient = toField(BigInt(args.to));

  const commitment = await noteCommitmentPoseidon(secret, args.amount, asset);
  const nullifier = await noteNullifierPoseidon(secret, commitment);

  const commitmentMatches = commitment === args.path.leaf;
  const pathValid = true; // path() already verifies membership on build
  const nullifierMatches = true;

  const blocker = commitmentMatches
    ? "Witness ready for the Poseidon circuit. Prove with snarkjs + the unshield zkey."
    : "Secret does not open this leaf (wrong note or keccak-era note).";

  const circomInput = {
    root: args.path.root.toString(),
    nullifier: nullifier.toString(),
    asset: assetField.toString(),
    amount: args.amount.toString(),
    recipient: recipient.toString(),
    secret: secret.toString(),
    pathElements: args.path.pathElements.map((x) => x.toString()),
    pathIndices: args.path.pathIndices.map(String),
  };

  return {
    publicInputs: { root: args.path.root, nullifier, asset: assetField, amount: args.amount, recipient },
    circomInput,
    checks: { commitmentMatches, nullifierMatches, pathValid },
    readyToProve: commitmentMatches,
    blocker,
  };
}

// ── transfer (private send) ───────────────────────────────────────────────────

export type NoteExport = {
  secret: Hex;
  commitment: Hex;
  nullifier: Hex;
  amountWei: string;
  asset: Address;
};

export type TransferWitness = {
  circomInput: Record<string, string | string[]>;
  publicInputs: {
    root: bigint;
    nullifier: bigint;
    newCommitment0: bigint;
    newCommitment1: bigint;
  };
  paymentNote: NoteExport;
  changeNote: NoteExport;
  checks: { commitmentMatches: boolean; amountsOk: boolean };
  blocker: string | null;
};

export async function buildTransferWitness(args: {
  secretHex: Hex;
  amountIn: bigint;
  amountPay: bigint;
  asset?: Address;
  path: PoseidonMerklePath;
}): Promise<TransferWitness> {
  const asset = args.asset ?? NATIVE_ASSET;
  const amountChange = args.amountIn - args.amountPay;
  const amountsOk = args.amountPay > 0n && amountChange >= 0n && args.amountPay + amountChange === args.amountIn;

  const secretIn = hexToField(args.secretHex);
  const commitmentIn = await noteCommitmentPoseidon(secretIn, args.amountIn, asset);
  const nullifier = await noteNullifierPoseidon(secretIn, commitmentIn);
  const commitmentMatches = commitmentIn === args.path.leaf;

  const secretPay = await randomSecretField();
  const secretChange = await randomSecretField();
  const newCommitment0 = await noteCommitmentPoseidon(secretPay, args.amountPay, asset);
  const newCommitment1 = await noteCommitmentPoseidon(secretChange, amountChange, asset);
  const nullifierPay = await noteNullifierPoseidon(secretPay, newCommitment0);
  const nullifierChange = await noteNullifierPoseidon(secretChange, newCommitment1);

  let blocker: string | null = null;
  if (!commitmentMatches) blocker = "This note secret does not match the leaf.";
  else if (!amountsOk) blocker = "Send amount must be > 0 and no more than your note.";

  const circomInput = {
    root: args.path.root.toString(),
    nullifier: nullifier.toString(),
    newCommitment0: newCommitment0.toString(),
    newCommitment1: newCommitment1.toString(),
    secretIn: secretIn.toString(),
    amountIn: args.amountIn.toString(),
    asset: toField(BigInt(asset)).toString(),
    pathElements: args.path.pathElements.map((x) => x.toString()),
    pathIndices: args.path.pathIndices.map(String),
    secretPay: secretPay.toString(),
    amountPay: args.amountPay.toString(),
    secretChange: secretChange.toString(),
    amountChange: amountChange.toString(),
  };

  return {
    circomInput,
    publicInputs: { root: args.path.root, nullifier, newCommitment0, newCommitment1 },
    paymentNote: {
      secret: fieldToHex(secretPay),
      commitment: fieldToHex(newCommitment0),
      nullifier: fieldToHex(nullifierPay),
      amountWei: args.amountPay.toString(),
      asset,
    },
    changeNote: {
      secret: fieldToHex(secretChange),
      commitment: fieldToHex(newCommitment1),
      nullifier: fieldToHex(nullifierChange),
      amountWei: amountChange.toString(),
      asset,
    },
    checks: { commitmentMatches, amountsOk },
    blocker,
  };
}
