import "server-only";
import { createPublicClient, createWalletClient, http, encodeFunctionData, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { z } from "zod";
import { CHAIN, RPC_URL, POOL_ADDRESS, PAY_MEMO_ADDRESS, assertPoolConfigured } from "../robinhood/network";
import { relayRequest } from "../validation/api";
import { PAY_MEMO_ABI, UNSHIELD_ABI } from "../shielded/abi";
import { POOL_TRANSFER_ABI } from "./sdk";

export class RelaySubmissionUnknownError extends Error {}

export type RelayRequest = z.infer<typeof relayRequest>;
// One in-process sender at a time. Production multi-instance hosting must use a
// single dedicated signer/queue, not several instances sharing this key.
let queue: Promise<unknown> = Promise.resolve();
let waiting = 0;
export function submitRelay(body: RelayRequest): Promise<Hex> {
  if (waiting >= 8) return Promise.reject(new Error("Relay busy."));
  waiting++;
  const result = queue.then(() => submit(body));
  queue = result.catch(() => {});
  return result.finally(() => {
    waiting--;
  });
}
async function submit(body: RelayRequest): Promise<Hex> {
  assertPoolConfigured();
  const key = process.env.MIRK_RELAYER_PRIVATE_KEY;
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) throw new Error("Relay is not configured.");
  const account = privateKeyToAccount(key as Hex);
  const client = createPublicClient({ chain: CHAIN, transport: http(RPC_URL, { timeout: 20_000, retryCount: 0 }) });
  const wallet = createWalletClient({
    chain: CHAIN,
    account,
    transport: http(RPC_URL, { timeout: 20_000, retryCount: 0 }),
  });
  if ((await client.getChainId()) !== CHAIN.id) throw new Error("Wrong RPC network.");
  const to = body.action === "memo" ? PAY_MEMO_ADDRESS : POOL_ADDRESS;
  const data =
    body.action === "transfer"
      ? encodeFunctionData({
          abi: POOL_TRANSFER_ABI,
          functionName: "transfer",
          args: [body.proof as Hex, body.root as Hex, body.nullifier as Hex, body.commitments as [Hex, Hex]],
        })
      : body.action === "unshield"
        ? encodeFunctionData({
            abi: UNSHIELD_ABI,
            functionName: "unshield",
            args: [
              body.proof as Hex,
              body.root as Hex,
              body.nullifier as Hex,
              body.asset as Hex,
              body.to as Hex,
              BigInt(body.amount),
            ],
          })
        : encodeFunctionData({
            abi: PAY_MEMO_ABI,
            functionName: "postMemo",
            args: [body.paymentCommitment as Hex, body.memo as Hex],
          });
  const gasPrice = await client.getGasPrice();
  const maxGasPrice = BigInt(process.env.MIRK_RELAY_MAX_GAS_PRICE_WEI || "10000000000");
  if (gasPrice > maxGasPrice) throw new Error("Gas price above relay limit.");
  const gas = await client.estimateGas({ to, data, account });
  if (gas > 15_000_000n) throw new Error("Transaction exceeds relay gas limit.");
  // Gas estimation executes the proof verifier; a rejected proof is never sent.
  return wallet.sendTransaction({ to, data, gas, gasPrice }).catch(() => {
    throw new RelaySubmissionUnknownError("Submission uncertain.");
  });
}
