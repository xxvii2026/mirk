import manifest from "./artifact-manifest.json";
import type { PoolCircuit } from "./sdk";

type File = { url: string; sha256: string };
export type CircuitArtifacts = { wasm: File; zkey: File; verificationKey: File };
export async function circuitArtifacts(circuit: PoolCircuit): Promise<CircuitArtifacts> {
  const files = (manifest.circuits as Partial<Record<PoolCircuit, CircuitArtifacts>>)[circuit];
  if (!files) throw new Error("Mirk's proving files are not built for this deployment yet.");
  for (const file of Object.values(files)) {
    if (!file.url.startsWith("/circuits/") || !/^[a-f0-9]{64}$/.test(file.sha256)) {
      throw new Error("Invalid Mirk proving manifest.");
    }
  }
  return files;
}
