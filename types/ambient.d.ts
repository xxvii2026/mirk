declare module "snarkjs" {
  type Mem = { type: "mem"; data: Uint8Array };
  export const groth16: {
    verify(key: unknown, signals: unknown[], proof: unknown): Promise<boolean>;
    fullProve(
      input: Record<string, string | string[]>,
      wasm: string | Mem,
      zkey: string | Mem,
    ): Promise<{ proof: unknown; publicSignals: unknown[] }>;
  };
}
