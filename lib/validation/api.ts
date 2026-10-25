import { isReceiveTag } from "@gloamtrade/sdk";
import { z } from "zod";
import { checkAccountNumber } from "../account-number";
import { CHAIN_ID } from "../robinhood/network";

const hex = (bytes?: number) =>
  z.string().regex(bytes === undefined ? /^0x(?:[0-9a-fA-F]{2})+$/ : new RegExp(`^0x[0-9a-fA-F]{${bytes * 2}}$`));

export const registerRequest = z
  .object({
    accountNumber: z.string().refine((s) => {
      const c = checkAccountNumber(s);
      return c.ok && c.value === s;
    }, "Invalid account number"),
    receiveTag: z.string().max(256).refine(isReceiveTag, "Invalid receive tag"),
  })
  .strict();

/** The only relay calls MIRK forwards: public proof data, never secrets. */
export const relayRequest = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("transfer"),
      chainId: z.literal(CHAIN_ID),
      proof: hex().refine((s) => s.length <= 2 + 2 * 512),
      root: hex(32),
      nullifier: hex(32),
      commitments: z.tuple([hex(32), hex(32)]),
    })
    .strict(),
  z
    .object({
      action: z.literal("unshield"),
      chainId: z.literal(CHAIN_ID),
      proof: hex().refine((s) => s.length <= 2 + 2 * 512),
      root: hex(32),
      nullifier: hex(32),
      asset: hex(20),
      to: hex(20),
      amount: z.string().regex(/^\d{1,78}$/),
    })
    .strict(),
  z
    .object({
      action: z.literal("memo"),
      chainId: z.literal(CHAIN_ID),
      paymentCommitment: hex(32),
      memo: hex().refine((s) => s.length <= 2 + 2 * 2048, "Memo too large"),
    })
    .strict(),
]);
