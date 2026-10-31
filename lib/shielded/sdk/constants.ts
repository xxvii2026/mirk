import { zeroAddress, type Address, type Chain } from "viem";

export const FIELD_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
export const NATIVE_ASSET = zeroAddress;
export const RH_TESTNET_CHAIN_ID = 46630;
export interface MirkAsset {
  symbol: string;
  address: Address;
  decimals: number;
  depositLimit: null;
}
export interface MirkNetwork {
  chainId: number;
  pool: Address;
  deployBlock: bigint;
  payMemo: Address;
  explorerUrl: string;
  rpcUrl: string;
  chain: Chain;
  assets: readonly MirkAsset[];
}
export function networkName(chainId: number) {
  if (chainId !== RH_TESTNET_CHAIN_ID) throw new Error("Mirk supports Robinhood Chain testnet only.");
  return "Robinhood Chain testnet";
}
export function isMainnetChainId(chainId: number) {
  networkName(chainId);
  return false;
}
export function poolForChainId(_chainId: number): Address {
  networkName(_chainId);
  throw new Error("Pass the configured Mirk pool explicitly. There is no default pool.");
}
export function assertDepositAllowed(chainId: number, _asset: Address, amount: bigint) {
  networkName(chainId);
  if (amount <= 0n || amount >= 1n << 128n) throw new Error("Deposit must be positive and below 2^128 base units.");
}
