import type { MirkAsset, MirkNetwork } from "@/lib/shielded/sdk";
import { getAddress, zeroAddress, type Address, type Chain, type Hex } from "viem";

/** Mirk deployments are explicit. Never fall back to another project's pool. */
function configuredAddress(raw: string | undefined): Address {
  if (!raw?.trim()) return zeroAddress;
  return getAddress(raw.trim());
}
export const CHAIN_ID = 46630;
export const POOL_ADDRESS = configuredAddress(process.env.NEXT_PUBLIC_MIRK_POOL_ADDRESS);
export const PAY_MEMO_ADDRESS = configuredAddress(process.env.NEXT_PUBLIC_MIRK_MEMO_ADDRESS);
export const POOL_DEPLOY_BLOCK = BigInt(process.env.NEXT_PUBLIC_MIRK_POOL_DEPLOY_BLOCK || "0");
export const MEMO_DEPLOY_BLOCK = BigInt(process.env.NEXT_PUBLIC_MIRK_MEMO_DEPLOY_BLOCK || "0");
export const POOL_CONFIGURED =
  POOL_ADDRESS !== zeroAddress && PAY_MEMO_ADDRESS !== zeroAddress && POOL_DEPLOY_BLOCK > 0n && MEMO_DEPLOY_BLOCK > 0n;
export function assertPoolConfigured() {
  if (!POOL_CONFIGURED) throw new Error("The Mirk shielded pool has not been configured on this deployment.");
}
export const EXPLORER_URL = "https://explorer.testnet.chain.robinhood.com";
const DEFAULT_RPC = "https://rpc.testnet.chain.robinhood.com";
/** Optional dedicated RPC; falls back to the public endpoint the SDK ships. */
export const RPC_URL = process.env.NEXT_PUBLIC_RH_RPC_URL?.trim() || DEFAULT_RPC;

export const CHAIN: Chain = {
  id: CHAIN_ID,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  testnet: true,
  blockExplorers: { default: { name: "Robinhood Testnet Explorer", url: EXPLORER_URL } },
  rpcUrls: { default: { http: [RPC_URL] } },
};

/**
 * Robinhood Chain RPCs accept up to 10M blocks per getLogs call. A smaller
 * chunk keeps each response comfortably under the 10,000-log cap.
 */
export const LOG_CHUNK_BLOCKS = 2_000_000n;

/** Independent testnet asset configuration. */
export const ASSETS: readonly MirkAsset[] = [
  { symbol: "ETH", address: zeroAddress, decimals: 18, depositLimit: null },
  { symbol: "USDG", address: "0x7E955252E15c84f5768B83c41a71F9eba181802F", decimals: 6, depositLimit: null },
];
export const NETWORK: MirkNetwork = {
  chainId: CHAIN_ID,
  pool: POOL_ADDRESS,
  deployBlock: POOL_DEPLOY_BLOCK,
  payMemo: PAY_MEMO_ADDRESS,
  explorerUrl: EXPLORER_URL,
  rpcUrl: RPC_URL,
  chain: CHAIN,
  assets: ASSETS,
};

export function assetByAddress(address: string): MirkAsset | undefined {
  const a = address.toLowerCase();
  return ASSETS.find((x) => x.address.toLowerCase() === a);
}

export function assetBySymbol(symbol: string): MirkAsset | undefined {
  return ASSETS.find((x) => x.symbol === symbol);
}

export function isNativeAsset(asset: MirkAsset | Address): boolean {
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
