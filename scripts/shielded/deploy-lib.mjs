import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, defineChain, http, zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { poseidonContract } from "circomlibjs";

export function artifact(file, name = file) {
  return JSON.parse(readFileSync(`contracts/out/${file}.sol/${name}.json`, "utf8"));
}
export async function deployMirk({ rpc, key, chainId, assets = [zeroAddress], registrar, onTransaction }) {
  if (chainId !== 31337 && chainId !== 46630) throw new Error("Testnet deployment only.");
  const chain = defineChain({
    id: chainId,
    name: "Mirk testnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpc] } },
  });
  const account = privateKeyToAccount(key);
  const client = createPublicClient({ chain, transport: http(rpc, { timeout: 60_000 }) });
  const wallet = createWalletClient({ chain, account, transport: http(rpc, { timeout: 60_000 }) });
  if ((await client.getChainId()) !== chainId) throw new Error("RPC chain mismatch.");
  const deploy = async (abi, bytecode, args = []) => {
    const hash = await wallet.deployContract({ abi, bytecode, args });
    await onTransaction?.({ hash, status: "submitted" });
    const receipt = await client.waitForTransactionReceipt({ hash, timeout: 180_000 });
    await onTransaction?.({
      hash,
      status: receipt.status,
      address: receipt.contractAddress,
      block: receipt.blockNumber,
    });
    if (receipt.status !== "success" || !receipt.contractAddress) throw new Error("Deployment reverted.");
    return { address: receipt.contractAddress, block: receipt.blockNumber, hash };
  };
  const deployArtifact = (file, name, args) => {
    const a = artifact(file, name);
    return deploy(a.abi, a.bytecode.object, args);
  };
  const poseidon = await deploy(poseidonContract.generateABI(2), poseidonContract.createCode(2));
  const verifiers = {};
  for (const [circuit, count] of [
    ["shield", 3],
    ["transfer", 4],
    ["unshield", 5],
  ]) {
    const name = `Mirk${circuit[0].toUpperCase() + circuit.slice(1)}Verifier`;
    const groth16 = await deployArtifact(circuit, name, []);
    const adapter = await deployArtifact("MirkGroth16Adapter", "MirkGroth16Adapter", [groth16.address, count]);
    verifiers[circuit] = { groth16, adapter };
  }
  const pool = await deployArtifact("MirkShieldedPool", "MirkShieldedPool", [
    poseidon.address,
    verifiers.shield.adapter.address,
    verifiers.transfer.adapter.address,
    verifiers.unshield.adapter.address,
    assets,
  ]);
  const memo = await deployArtifact("MirkPayMemo", "MirkPayMemo", [pool.address]);
  const registry = await deployArtifact("MirkAccountRegistry", "MirkAccountRegistry", [
    account.address,
    registrar ?? account.address,
  ]);
  return { chainId, deployer: account.address, poseidon, verifiers, pool, memo, registry };
}
