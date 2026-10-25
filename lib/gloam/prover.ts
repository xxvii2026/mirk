import type { PoolCircuit, Prover } from "@gloamtrade/sdk";
import type { ProverRequest, ProverResponse } from "./prover-protocol";

/** Main-thread handle on the prover Web Worker. */

let worker: Worker | null = null;
let nextId = 1;
const waiting = new Map<number, { resolve: (r: ProverResponse) => void }>();

function getWorker(): Worker {
  if (worker) return worker;
  if (typeof Worker === "undefined") throw new Error("This browser cannot run the on-device prover.");
  worker = new Worker(new URL("../../workers/prover.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e: MessageEvent<ProverResponse>) => {
    const w = waiting.get(e.data.id);
    if (!w) return;
    waiting.delete(e.data.id);
    w.resolve(e.data);
  };
  worker.onerror = () => {
    for (const [id, w] of waiting) w.resolve({ id, ok: false, error: "The on-device prover stopped unexpectedly." });
    waiting.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

type RequestBody = ProverRequest extends infer R ? (R extends ProverRequest ? Omit<R, "id"> : never) : never;

function call(req: RequestBody): Promise<ProverResponse> {
  const id = nextId++;
  return new Promise((resolve) => {
    waiting.set(id, { resolve });
    getWorker().postMessage({ ...req, id } as ProverRequest);
  });
}

/** Download and verify a circuit's files ahead of time. */
export async function warmCircuit(circuit: PoolCircuit): Promise<void> {
  const r = await call({ type: "warm", circuit });
  if (!r.ok) throw new Error(r.error);
}

/** A Prover for the SDK builders that runs in the worker. */
export function workerProver(circuit: PoolCircuit): Prover {
  return async (input) => {
    const r = await call({ type: "prove", circuit, input });
    if (!r.ok) throw new Error(r.error);
    if (!r.proofBytes) throw new Error("The prover returned no proof.");
    return { proofBytes: r.proofBytes, publicSignals: r.publicSignals };
  };
}
