import { describe, expect, it } from "vitest";
import { GLOAM_NETWORKS } from "@gloamtrade/sdk";
import {
  CHAIN_ID,
  POOL_ADDRESS,
  WrongNetworkError,
  assertTestnet,
  assetBySymbol,
  isNativeAsset,
} from "@/lib/robinhood/network";
import { relayRequest, registerRequest } from "@/lib/validation/api";
import { RateLimiter } from "@/lib/validation/rate-limit";
import { luhnCheckDigit } from "@/lib/account-number";

describe("network guards", () => {
  it("uses the SDK's Robinhood testnet pool", () => {
    expect(CHAIN_ID).toBe(46630);
    expect(POOL_ADDRESS).toBe(GLOAM_NETWORKS.robinhood.pool);
  });

  it("refuses other chains", () => {
    expect(() => assertTestnet(46630)).not.toThrow();
    expect(() => assertTestnet(4663)).toThrow(WrongNetworkError);
    expect(() => assertTestnet(1)).toThrow(WrongNetworkError);
    expect(() => assertTestnet(undefined)).toThrow(WrongNetworkError);
  });

  it("knows native vs token assets", () => {
    expect(isNativeAsset(assetBySymbol("ETH")!)).toBe(true);
    expect(isNativeAsset(assetBySymbol("USDG")!)).toBe(false);
  });
});

describe("API validation", () => {
  const num = `48291630771${luhnCheckDigit("48291630771")}`;
  it("accepts only canonical account numbers and real receive tags", () => {
    expect(registerRequest.safeParse({ accountNumber: num, receiveTag: "gloamr1.nope" }).success).toBe(false);
    expect(registerRequest.safeParse({ accountNumber: "4829 1630 7714", receiveTag: "x" }).success).toBe(false);
    expect(registerRequest.safeParse({ accountNumber: num, receiveTag: "x", wallet: "0x" }).success).toBe(false);
  });

  it("only forwards relay calls for testnet with bounded payloads", () => {
    const h = (n: number) => `0x${"ab".repeat(n)}`;
    const ok = { action: "memo", chainId: 46630, paymentCommitment: h(32), memo: h(100) };
    expect(relayRequest.safeParse(ok).success).toBe(true);
    expect(relayRequest.safeParse({ ...ok, chainId: 4663 }).success).toBe(false);
    expect(relayRequest.safeParse({ ...ok, memo: h(5000) }).success).toBe(false);
    expect(relayRequest.safeParse({ ...ok, secret: h(32) }).success).toBe(false);
    expect(relayRequest.safeParse({ action: "shieldBound", chainId: 46630 }).success).toBe(false);
  });

  it("rate limits per key", () => {
    const rl = new RateLimiter(2, 1000);
    expect(rl.take("a", 0)).toBe(true);
    expect(rl.take("a", 1)).toBe(true);
    expect(rl.take("a", 2)).toBe(false);
    expect(rl.take("b", 2)).toBe(true);
    expect(rl.take("a", 1500)).toBe(true);
  });
});
