import "server-only";
import { createPublicClient, createWalletClient, http, keccak256, stringToHex, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { REGISTRY_ABI } from "../gloam/abi";
import { CHAIN, REGISTRY_ADDRESS, RPC_URL } from "../robinhood/network";

/** Server-only registrar. The key is read from the environment and never logged or returned. */

export function registrarConfigured(): boolean {
  return Boolean(REGISTRY_ADDRESS && /^0x[0-9a-fA-F]{64}$/.test(process.env.REGISTRAR_PRIVATE_KEY ?? ""));
}

function clients() {
  const key = process.env.REGISTRAR_PRIVATE_KEY as Hex | undefined;
  if (!REGISTRY_ADDRESS || !key) throw new Error("registrar-not-configured");
  const account = privateKeyToAccount(key);
  const transport = http(RPC_URL, { timeout: 15_000 });
  return {
    address: REGISTRY_ADDRESS,
    account,
    publicClient: createPublicClient({ chain: CHAIN, transport }),
    walletClient: createWalletClient({ chain: CHAIN, transport, account }),
  };
}

export type RegisterOutcome =
  | { ok: true; hash: Hex }
  | { ok: false; code: "number-taken" | "tag-taken" | "registrar-unfunded" | "not-configured" | "failed" };

export async function registerOnChain(accountNumber: string, receiveTag: string): Promise<RegisterOutcome> {
  if (!registrarConfigured()) return { ok: false, code: "not-configured" };
  const { address, account, publicClient, walletClient } = clients();
  const n = BigInt(accountNumber);
  const tagHex = stringToHex(receiveTag);

  const [taken, tagOwner, balance] = await Promise.all([
    publicClient.readContract({ address, abi: REGISTRY_ABI, functionName: "isRegistered", args: [n] }),
    publicClient.readContract({
      address,
      abi: REGISTRY_ABI,
      functionName: "accountOfTagHash",
      args: [keccak256(tagHex)],
    }),
    publicClient.getBalance({ address: account.address }),
  ]);
  if (taken) return { ok: false, code: "number-taken" };
  if (tagOwner !== 0n) return { ok: false, code: "tag-taken" };
  if (balance === 0n) return { ok: false, code: "registrar-unfunded" };

  try {
    const { request } = await publicClient.simulateContract({
      address,
      abi: REGISTRY_ABI,
      functionName: "register",
      args: [n, tagHex],
      account,
    });
    const hash = await walletClient.writeContract(request);
    return { ok: true, hash };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/insufficient funds/i.test(msg)) return { ok: false, code: "registrar-unfunded" };
    if (/AccountAlreadyRegistered/.test(msg)) return { ok: false, code: "number-taken" };
    if (/ReceiveTagAlreadyRegistered/.test(msg)) return { ok: false, code: "tag-taken" };
    return { ok: false, code: "failed" };
  }
}
