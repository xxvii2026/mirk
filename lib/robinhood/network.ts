import { GLOAM_NETWORKS, type GloamAsset } from "@gloamtrade/sdk";
import { getAddress, type Address, type Chain, type Hex } from "viem";

/** Robinhood Chain testnet as shipped by the installed Gloam SDK. */
export const NETWORK = GLOAM_NETWORKS.robinhood;

export const CHAIN_ID = NETWORK.chainId;
export const POOL_ADDRESS: Address = NETWORK.pool;
export const POOL_DEPLOY_BLOCK: bigint = NETWORK.deployBlock;
export const PAY_MEMO_ADDRESS: Address = NETWORK.payMemo;
export const EXPLORER_URL = NETWORK.explorerUrl.replace(/\/+$/, "");

/** Optional dedicated RPC; falls back to the public endpoint the SDK ships. */
export const RPC_URL = process.env.NEXT_PUBLIC_RH_RPC_URL?.trim() || NETWORK.rpcUrl;

export const CHAIN: Chain = {
  ...NETWORK.chain,
  rpcUrls: { default: { http: [RPC_URL] } },
};

/**
 * Robinhood Chain RPCs accept up to 10M blocks per getLogs call. A smaller
 * chunk keeps each response comfortably under the 10,000-log cap.
 */
export const LOG_CHUNK_BLOCKS = 2_000_000n;

/** Assets the testnet pool takes, straight from the SDK. */
export const ASSETS: readonly GloamAsset[] = NETWORK.assets;

export function assetByAddress(address: string): GloamAsset | undefined {
  const a = address.toLowerCase();
  return ASSETS.find((x) => x.address.toLowerCase() === a);
}

export function assetBySymbol(symbol: string): GloamAsset | undefined {
  return ASSETS.find((x) => x.symbol === symbol);
}

export function isNativeAsset(asset: GloamAsset | Address): boolean {
  const address = typeof asset === "string" ? asset : asset.address;
  return BigInt(address) === 0n;
}

export const REGISTRY_ADDRESS: Address | null = (() => {
  const raw = process.env.NEXT_PUBLIC_ACCOUNT_REGISTRY_ADDRESS?.trim();
  if (!raw) return null;
  try {
    return getAddress(raw);
  } catch {
    return null;
  }
})();

export function txUrl(hash: Hex): string {
  return `${EXPLORER_URL}/tx/${hash}`;
}

export function addressUrl(address: Address): string {
  return `${EXPLORER_URL}/address/${address}`;
}

export class WrongNetworkError extends Error {
  constructor(actual: number | undefined) {
    super(
      actual === undefined
        ? "Your wallet is not connected to a network."
        : `Your wallet is on network ${actual}. Switch to Robinhood Chain testnet (${CHAIN_ID}) to continue.`,
    );
    this.name = "WrongNetworkError";
  }
}

/** Guard every write: throws unless the wallet is on Robinhood Chain testnet. */
export function assertTestnet(chainId: number | undefined): asserts chainId is typeof CHAIN_ID {
  if (chainId !== CHAIN_ID) throw new WrongNetworkError(chainId);
}
