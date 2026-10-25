import { isReceiveTag } from "@gloamtrade/sdk";
import { hexToString, type PublicClient } from "viem";
import { accountNumberToUint64, type AccountNumber } from "../account-number";
import { REGISTRY_ABI } from "../gloam/abi";
import { REGISTRY_ADDRESS } from "../robinhood/network";

export class RegistryUnavailableError extends Error {
  constructor() {
    super("The MIRK account registry is not configured on this deployment.");
    this.name = "RegistryUnavailableError";
  }
}

/** Resolve an account number to its Gloam receive tag, straight from the chain. */
export async function resolveAccount(client: PublicClient, n: AccountNumber): Promise<string | null> {
  if (!REGISTRY_ADDRESS) throw new RegistryUnavailableError();
  const raw = await client.readContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "receiveTagOf",
    args: [accountNumberToUint64(n)],
  });
  if (!raw || raw === "0x") return null;
  const tag = hexToString(raw);
  return isReceiveTag(tag) ? tag : null;
}
