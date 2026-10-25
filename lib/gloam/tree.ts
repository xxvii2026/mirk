import { IncrementalMerkleTreePoseidon, fieldToHex, hexToField, type PoseidonMerklePath } from "@gloamtrade/sdk";
import type { Address, Hex, PublicClient } from "viem";
import { getDb } from "../crypto-store/db";
import { LOG_CHUNK_BLOCKS, POOL_ADDRESS, POOL_DEPLOY_BLOCK } from "../robinhood/network";

/**
 * Incremental rebuild of the Gloam pool's Merkle tree. Mirrors the SDK's
 * syncTree (same events, same on-chain ordering) but caches the public leaf
 * list in IndexedDB so a refresh only fetches new blocks. Chain events stay the
 * source of truth: the rebuilt root must equal the pool's currentRoot at the
 * synced block, or the cache is discarded and rebuilt from the deploy block.
 */

const SHIELDED_EVENT = {
  type: "event",
  name: "Shielded",
  inputs: [
    { name: "commitment", type: "bytes32", indexed: true },
    { name: "asset", type: "address", indexed: true },
    { name: "amount", type: "uint256", indexed: false },
    { name: "leafIndex", type: "uint256", indexed: false },
    { name: "from", type: "address", indexed: true },
  ],
} as const;

const TRANSFERRED_EVENT = {
  type: "event",
  name: "Transferred",
  inputs: [
    { name: "nullifier", type: "bytes32", indexed: true },
    { name: "newCommitments", type: "bytes32[2]", indexed: false },
  ],
} as const;

// Retired on live pools, but any historical leaves must still be replayed.
const SEALED_SWAPPED_EVENT = {
  type: "event",
  name: "SealedSwapped",
  inputs: [
    { name: "nullifier", type: "bytes32", indexed: true },
    { name: "assetIn", type: "address", indexed: true },
    { name: "assetOut", type: "address", indexed: true },
    { name: "newCommitmentOut", type: "bytes32", indexed: false },
    { name: "newCommitmentChange", type: "bytes32", indexed: false },
  ],
} as const;

export const POOL_STATE_READ_ABI = [
  { type: "function", name: "currentRoot", stateMutability: "view", inputs: [], outputs: [{ type: "bytes32" }] },
  {
    type: "function",
    name: "isSpent",
    stateMutability: "view",
    inputs: [{ name: "nullifier", type: "bytes32" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "commitmentSeen",
    stateMutability: "view",
    inputs: [{ name: "commitment", type: "bytes32" }],
    outputs: [{ type: "bool" }],
  },
] as const;

interface CachedLeaf {
  c: Hex;
  b: string;
  l: number;
  s: number;
}

interface TreeCache {
  pool: Address;
  lastBlock: string;
  leaves: CachedLeaf[];
}

const CACHE_KEY = `tree:${POOL_ADDRESS.toLowerCase()}`;

export interface PoolTree {
  root: Hex;
  leafCount: number;
  syncedTo: bigint;
  hasCommitment(commitment: Hex): boolean;
  pathForCommitment(commitment: Hex): Promise<PoseidonMerklePath | null>;
}

type Insert = CachedLeaf;

async function fetchInserts(client: PublicClient, from: bigint, to: bigint): Promise<Insert[]> {
  const out: Insert[] = [];
  for (let start = from; start <= to; start += LOG_CHUNK_BLOCKS) {
    const end = start + LOG_CHUNK_BLOCKS - 1n > to ? to : start + LOG_CHUNK_BLOCKS - 1n;
    const range = { address: POOL_ADDRESS, fromBlock: start, toBlock: end } as const;
    const [shields, transfers, swaps] = await Promise.all([
      client.getLogs({ ...range, event: SHIELDED_EVENT }),
      client.getLogs({ ...range, event: TRANSFERRED_EVENT }),
      client.getLogs({ ...range, event: SEALED_SWAPPED_EVENT }).catch(() => []),
    ]);
    for (const log of shields) {
      if (!log.args.commitment || log.blockNumber == null) continue;
      out.push({ c: log.args.commitment, b: log.blockNumber.toString(), l: log.logIndex ?? 0, s: 0 });
    }
    for (const log of transfers) {
      const pair = log.args.newCommitments;
      if (!pair || log.blockNumber == null) continue;
      out.push({ c: pair[0], b: log.blockNumber.toString(), l: log.logIndex ?? 0, s: 0 });
      out.push({ c: pair[1], b: log.blockNumber.toString(), l: log.logIndex ?? 0, s: 1 });
    }
    for (const log of swaps) {
      const { newCommitmentOut, newCommitmentChange } = log.args;
      if (!newCommitmentOut || !newCommitmentChange || log.blockNumber == null) continue;
      out.push({ c: newCommitmentOut, b: log.blockNumber.toString(), l: log.logIndex ?? 0, s: 0 });
      out.push({ c: newCommitmentChange, b: log.blockNumber.toString(), l: log.logIndex ?? 0, s: 1 });
    }
  }
  return out;
}

export function sortInserts(list: Insert[]): Insert[] {
  return [...list].sort((x, y) => {
    const bx = BigInt(x.b);
    const by = BigInt(y.b);
    if (bx !== by) return bx < by ? -1 : 1;
    if (x.l !== y.l) return x.l - y.l;
    return x.s - y.s;
  });
}

async function readCache(): Promise<TreeCache | null> {
  try {
    const row = await getDb().chain.get(CACHE_KEY);
    if (!row) return null;
    const parsed = JSON.parse(row.value) as TreeCache;
    return parsed.pool.toLowerCase() === POOL_ADDRESS.toLowerCase() ? parsed : null;
  } catch {
    return null;
  }
}

async function writeCache(cache: TreeCache) {
  try {
    await getDb().chain.put({ key: CACHE_KEY, value: JSON.stringify(cache) });
  } catch {
    // Cache is an optimisation only.
  }
}

async function build(leaves: CachedLeaf[], syncedTo: bigint): Promise<PoolTree> {
  const tree = new IncrementalMerkleTreePoseidon();
  await tree.init();
  const index = new Map<string, number>();
  for (const leaf of leaves) {
    const i = await tree.insert(hexToField(leaf.c));
    index.set(leaf.c.toLowerCase(), i);
  }
  return {
    root: fieldToHex(tree.currentRoot),
    leafCount: tree.nextIndex,
    syncedTo,
    hasCommitment: (c) => index.has(c.toLowerCase()),
    pathForCommitment: async (c) => {
      const i = index.get(c.toLowerCase());
      if (i === undefined) return null;
      try {
        return await tree.path(i);
      } catch {
        return null;
      }
    },
  };
}

let inflight: Promise<PoolTree> | null = null;

/** Sync the pool tree to the latest block and verify its root against the chain. */
export function syncPoolTree(client: PublicClient): Promise<PoolTree> {
  inflight ??= doSync(client).finally(() => {
    inflight = null;
  });
  return inflight;
}

async function doSync(client: PublicClient): Promise<PoolTree> {
  const latest = await client.getBlockNumber({ cacheTime: 0 });
  const cached = await readCache();

  const attempt = async (base: TreeCache | null): Promise<PoolTree | null> => {
    const from = base ? BigInt(base.lastBlock) + 1n : POOL_DEPLOY_BLOCK;
    const fresh = from <= latest ? await fetchInserts(client, from, latest) : [];
    const leaves = [...(base?.leaves ?? []), ...sortInserts(fresh)];
    const tree = await build(leaves, latest);
    const onchain = await client.readContract({
      address: POOL_ADDRESS,
      abi: POOL_STATE_READ_ABI,
      functionName: "currentRoot",
      blockNumber: latest,
    });
    if (onchain.toLowerCase() !== tree.root.toLowerCase()) return null;
    await writeCache({ pool: POOL_ADDRESS, lastBlock: latest.toString(), leaves });
    return tree;
  };

  const incremental = cached ? await attempt(cached) : null;
  if (incremental) return incremental;
  const full = await attempt(null);
  if (full) return full;
  throw new Error("The rebuilt pool tree does not match the chain. Try again in a moment.");
}

export async function clearTreeCache() {
  await getDb().chain.delete(CACHE_KEY);
}
