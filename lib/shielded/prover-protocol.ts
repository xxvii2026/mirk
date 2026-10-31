import type { PoolCircuit } from "@/lib/shielded/sdk";
import type { Hex } from "viem";

export type ProverRequest =
  | { id: number; type: "warm"; circuit: PoolCircuit }
  | { id: number; type: "prove"; circuit: PoolCircuit; input: Record<string, string | string[]> };

export type ProverResponse =
  { id: number; ok: true; proofBytes?: Hex; publicSignals?: string[] } | { id: number; ok: false; error: string };
