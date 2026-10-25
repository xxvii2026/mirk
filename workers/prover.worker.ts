/// <reference lib="webworker" />
/**
 * Groth16 prover. Runs off the main thread so the interface stays responsive.
 * Circuit files come from the SDK's official artifact URLs and are checked
 * against the SDK's pinned SHA-256 hashes before use.
 */
import {
  circuitArtifactFiles,
  circuitArtifactUrls,
  ceremonyForChainId,
  packGroth16Proof,
  type Groth16Proof,
  type PoolCircuit,
} from "@gloamtrade/sdk";
import { CHAIN_ID } from "../lib/robinhood/network";
import type { ProverRequest, ProverResponse } from "../lib/gloam/prover-protocol";

declare const self: DedicatedWorkerGlobalScope;

const CACHE_NAME = "mirk-circuits-v1";
const loaded = new Map<string, Promise<Uint8Array>>();

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes);
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", copy));
  return Array.from(d, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function fetchVerified(url: string, expected: string): Promise<Uint8Array> {
  let cache: Cache | null = null;
  try {
    cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(url);
    if (hit) {
      const bytes = new Uint8Array(await hit.arrayBuffer());
      if ((await sha256Hex(bytes)) === expected) return bytes;
      await cache.delete(url);
    }
  } catch {
    cache = null;
  }
  const res = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer" });
  if (!res.ok) throw new Error(`Could not download proving files (${res.status}).`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if ((await sha256Hex(bytes)) !== expected) {
    throw new Error("A proving file failed its integrity check. Nothing was submitted.");
  }
  try {
    await cache?.put(url, new Response(new Uint8Array(bytes)));
  } catch {
    // Caching is best effort.
  }
  return bytes;
}

function artifact(url: string, sha: string) {
  let p = loaded.get(url);
  if (!p) {
    p = fetchVerified(url, sha);
    p.catch(() => loaded.delete(url));
    loaded.set(url, p);
  }
  return p;
}

async function load(circuit: PoolCircuit) {
  const urls = circuitArtifactUrls(circuit, CHAIN_ID);
  const files = circuitArtifactFiles(circuit, ceremonyForChainId(CHAIN_ID));
  const [wasm, zkey] = await Promise.all([
    artifact(urls.wasm, files.sha256.wasm),
    artifact(urls.zkey, files.sha256.zkey),
  ]);
  return { wasm, zkey };
}

self.onmessage = async (event: MessageEvent<ProverRequest>) => {
  const msg = event.data;
  const reply = (r: ProverResponse) => self.postMessage(r);
  try {
    if (msg.type === "warm") {
      await load(msg.circuit);
      reply({ id: msg.id, ok: true });
      return;
    }
    const { wasm, zkey } = await load(msg.circuit);
    const snarkjs = await import("snarkjs");
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      msg.input,
      { type: "mem", data: wasm },
      { type: "mem", data: zkey },
    );
    reply({
      id: msg.id,
      ok: true,
      proofBytes: packGroth16Proof(proof as Groth16Proof),
      publicSignals: publicSignals as string[],
    });
  } catch (e) {
    reply({ id: msg.id, ok: false, error: e instanceof Error ? e.message : "Proof generation failed." });
  }
};
