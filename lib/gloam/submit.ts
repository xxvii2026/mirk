import { GloamRelayError, relayIntent, relayMemo, type GloamIntent } from "@gloamtrade/sdk";
import type { Hex } from "viem";
import { CHAIN_ID } from "../robinhood/network";

/**
 * Relay submission. The browser cannot call the Gloam relay directly (it sends
 * no CORS headers), so requests go through MIRK's /api/relay pass-through. It
 * forwards only public proof data that would appear on chain anyway: no note
 * secret, receive key or wallet signature is ever in these requests.
 */

export const RELAY_PATH = "/api/relay";

export class RelayUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RelayUnavailableError";
  }
}

function wrap(e: unknown): never {
  if (e instanceof GloamRelayError) throw new RelayUnavailableError(e.message);
  throw new RelayUnavailableError("The private relay could not be reached.");
}

export async function relaySpend(intent: GloamIntent): Promise<Hex> {
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
