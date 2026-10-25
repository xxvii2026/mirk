import type { Address, Hex } from "viem";
import { z } from "zod";

/** Plaintext record shapes. These only ever exist in memory, encrypted at rest. */

const hex = z.custom<Hex>((v) => typeof v === "string" && /^0x[0-9a-fA-F]*$/.test(v), "Expected hex");
const hex32 = z.custom<Hex>((v) => typeof v === "string" && /^0x[0-9a-fA-F]{64}$/.test(v), "Expected 32-byte hex");
const address = z.custom<Address>((v) => typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v), "Expected address");
const uintString = z.string().regex(/^\d+$/);

export const noteStatus = z.enum([
  /** Built and stored, transaction not confirmed yet. */
  "pending",
  /** Confirmed in the pool and spendable. */
  "unspent",
  /** Being spent by a submitted transaction. */
  "spending",
  "spent",
  /** Its transaction failed, so it never entered the pool. */
  "failed",
]);
export type NoteStatus = z.infer<typeof noteStatus>;

export const noteRecord = z.object({
  kind: z.literal("note"),
  secret: hex32,
  commitment: hex32,
  nullifier: hex32,
  amountWei: uintString,
  asset: address,
  status: noteStatus,
  origin: z.enum(["shield", "change", "received", "claim", "split"]),
  createdAt: z.number(),
  txHash: hex32.optional(),
  /** The transaction spending it, while status is spending/spent. */
  spentBy: hex32.optional(),
});
export type NoteRecord = z.infer<typeof noteRecord>;

export const receiveKeyJwk = z.object({
  kty: z.string().optional(),
  crv: z.string().optional(),
  x: z.string().optional(),
  y: z.string().optional(),
  d: z.string().optional(),
  ext: z.boolean().optional(),
  key_ops: z.array(z.string()).optional(),
});

export const accountRecord = z.object({
  kind: z.literal("account"),
  number: z.string().regex(/^\d{12}$/),
  tag: z.string(),
  privateJwk: receiveKeyJwk,
  status: z.enum(["unregistered", "pending", "active"]),
  txHash: hex32.optional(),
  createdAt: z.number(),
});
export type AccountRecord = z.infer<typeof accountRecord>;

export const activityType = z.enum(["added", "sent", "received", "claim-created", "claim-swept", "cashed-out"]);
export type ActivityType = z.infer<typeof activityType>;

export const activityRecord = z.object({
  kind: z.literal("activity"),
  type: activityType,
  amountWei: uintString,
  asset: address,
  createdAt: z.number(),
  status: z.enum(["pending", "confirmed", "partial", "failed"]),
  txHashes: z.array(hex32),
  /** Short local-only description, e.g. "To •••• 7714". Never a name. */
  detail: z.string().optional(),
  error: z.string().optional(),
});
export type ActivityRecord = z.infer<typeof activityRecord>;

export const incomingRecord = z.object({
  kind: z.literal("incoming"),
  commitment: hex32,
  nullifier: hex32,
  amountWei: uintString,
  asset: address,
  /** gloam1. note package. The payer knows this secret too until it is swept. */
  notePackage: z.string(),
  status: z.enum(["found", "sweeping", "swept", "lost"]),
  source: z.enum(["account", "claim"]),
  sweepTx: hex32.optional(),
  /** Commitment of the fresh note a sweep moves this payment into. */
  freshCommitment: hex32.optional(),
  createdAt: z.number(),
});
export type IncomingRecord = z.infer<typeof incomingRecord>;

export const claimRecord = z.object({
  kind: z.literal("claim"),
  /** The full claim link, kept so the sender can copy it again or reclaim it. */
  link: z.string(),
  tag: z.string(),
  privateJwk: receiveKeyJwk,
  amountWei: uintString,
  asset: address,
  paymentCommitment: hex32.optional(),
  txHash: hex32.optional(),
  status: z.enum(["funding", "open", "claimed", "failed"]),
  createdAt: z.number(),
});
export type ClaimRecord = z.infer<typeof claimRecord>;

/** A payment that landed but whose delivery memo still needs posting. */
export const pendingMemoRecord = z.object({
  kind: z.literal("pending-memo"),
  paymentCommitment: hex32,
  memo: hex,
  activityId: z.string().optional(),
  createdAt: z.number(),
});
export type PendingMemoRecord = z.infer<typeof pendingMemoRecord>;

export const anyRecord = z.discriminatedUnion("kind", [
  noteRecord,
  accountRecord,
  activityRecord,
  incomingRecord,
  claimRecord,
  pendingMemoRecord,
]);
export type AnyRecord = z.infer<typeof anyRecord>;
export type RecordKind = AnyRecord["kind"];
export type RecordOf<K extends RecordKind> = Extract<AnyRecord, { kind: K }>;
