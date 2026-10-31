import { MirkRelayError, relayIntent, relayMemo, type MirkIntent } from "@/lib/shielded/sdk";
import type { Hex } from "viem";
import { CHAIN_ID, POOL_ADDRESS, assertPoolConfigured } from "../robinhood/network";

/** Submits public proof data and encrypted memos to Mirk's own relay. */

export const RELAY_PATH = "/api/relay";

export class RelayUnavailableError extends MirkRelayError {
  constructor(message: string, code = "network") {
    super(message, code);
    this.name = "RelayUnavailableError";
  }
}

function wrap(e: unknown): never {
  if (e instanceof MirkRelayError) throw new RelayUnavailableError(e.message, e.code);
  throw new RelayUnavailableError("The private relay could not be reached.");
}

export async function relaySpend(intent: MirkIntent): Promise<Hex> {
  assertPoolConfigured();
  if (intent.exec?.poolAddress.toLowerCase() !== POOL_ADDRESS.toLowerCase())
    throw new Error("Wrong pool for this payment.");
  if (intent.chainId !== CHAIN_ID) throw new Error("Wrong network for this payment.");
  try {
    return await relayIntent(intent, { url: RELAY_PATH });
  } catch (e) {
    wrap(e);
  }
}

export async function relayPaymentMemo(paymentCommitment: Hex, memo: Hex): Promise<Hex> {
  try {
    return await relayMemo({ chainId: CHAIN_ID, paymentCommitment, memo }, { url: RELAY_PATH });
  } catch (e) {
    wrap(e);
  }
}

export function ticketToMemoBytes(ticket: string): Hex {
  let hex = "0x";
  for (const b of new TextEncoder().encode(ticket)) hex += b.toString(16).padStart(2, "0");
  return hex as Hex;
}
