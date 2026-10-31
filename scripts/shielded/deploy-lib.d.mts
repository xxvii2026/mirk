import type { Abi, Address, Hex } from "viem";
export function artifact(file: string, name?: string): { abi: Abi; bytecode: { object: Hex } };
type Deployment = { address: Address; block: bigint; hash: Hex };
export function deployMirk(options: {
  rpc: string;
  key: Hex;
  chainId: number;
  assets?: Address[];
  registrar?: Address;
  onTransaction?: (event: {
    hash: Hex;
    status: string;
    address?: Address | null;
    block?: bigint;
  }) => void | Promise<void>;
}): Promise<{
  chainId: number;
  deployer: Address;
  poseidon: Deployment;
  verifiers: Record<string, { groth16: Deployment; adapter: Deployment }>;
  pool: Deployment;
  memo: Deployment;
  registry: Deployment;
}>;
