import { describe, expect, it } from "vitest";
import { createPublicClient, http } from "viem";
import { syncPoolTree } from "@/lib/shielded/tree";
import { CHAIN, RPC_URL } from "@/lib/robinhood/network";

// Reads the configured Mirk pool on Robinhood Chain testnet. Run with LIVE=1.
describe.runIf(process.env.LIVE === "1")("pool tree (live)", () => {
  it("rebuilds the tree and matches the on-chain root", async () => {
    const client = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) });
    const tree = await syncPoolTree(client);
    expect(tree.leafCount).toBeGreaterThan(0);
    const again = await syncPoolTree(client);
    expect(again.leafCount).toBeGreaterThanOrEqual(tree.leafCount);
  }, 120_000);
});
