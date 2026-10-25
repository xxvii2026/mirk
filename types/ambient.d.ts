declare module "snarkjs" {
  type Mem = { type: "mem"; data: Uint8Array };
  export const groth16: {
    fullProve(
      input: Record<string, string | string[]>,
      wasm: string | Mem,
      zkey: string | Mem,
    ): Promise<{ proof: unknown; publicSignals: unknown[] }>;
  };
}
