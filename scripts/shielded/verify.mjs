import { readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, http, getAddress, zeroAddress } from "viem";
import { buildPoseidon } from "circomlibjs";
import { artifact } from "./deploy-lib.mjs";

const deployment = JSON.parse(readFileSync("deployments/mirk-testnet.json", "utf8"));
const client = createPublicClient({
  transport: http(process.env.NEXT_PUBLIC_RH_RPC_URL || "https://rpc.testnet.chain.robinhood.com", { timeout: 30_000 }),
});
if ((await client.getChainId()) !== 46630) throw new Error("Wrong verification network.");
const checks = [];
function equal(actual, expected, message) {
  if (String(actual).toLowerCase() !== String(expected).toLowerCase()) throw new Error(message);
  checks.push(message);
}
function mask(code, references) {
  const bytes = Buffer.from(code.slice(2), "hex");
  for (const entries of Object.values(references || {}))
    for (const { start, length } of entries) bytes.fill(0, start, start + length);
  return bytes.toString("hex");
}
async function checkContract(file, name, deployed) {
  const compiled = artifact(file, name);
  const [code, receipt] = await Promise.all([
    client.getCode({ address: deployed.address }),
    client.getTransactionReceipt({ hash: deployed.hash }),
  ]);
  equal(receipt.status, "success", `${name}: successful deployment receipt`);
  equal(getAddress(receipt.contractAddress), getAddress(deployed.address), `${name}: recorded address matches receipt`);
  equal(
    mask(code, compiled.deployedBytecode.immutableReferences),
    mask(compiled.deployedBytecode.object, compiled.deployedBytecode.immutableReferences),
    `${name}: deployed runtime matches compiled source`,
  );
  return compiled;
}
const contracts = [
  ...Object.entries(deployment.verifiers).flatMap(([circuit, v]) => [
    [circuit, `Mirk${circuit[0].toUpperCase() + circuit.slice(1)}Verifier`, v.groth16],
    ["MirkGroth16Adapter", "MirkGroth16Adapter", v.adapter],
  ]),
  ["MirkShieldedPool", "MirkShieldedPool", deployment.pool],
  ["MirkPayMemo", "MirkPayMemo", deployment.memo],
  ["MirkAccountRegistry", "MirkAccountRegistry", deployment.registry],
];
await Promise.all(contracts.map((args) => checkContract(...args)));
const read = (address, abi, functionName, args = []) => client.readContract({ address, abi, functionName, args });
const poolAbi = artifact("MirkShieldedPool").abi;
for (const [circuit, count] of [
  ["shield", 3],
  ["transfer", 4],
  ["unshield", 5],
]) {
  const v = deployment.verifiers[circuit];
  equal(
    await read(deployment.pool.address, poolAbi, `${circuit}Verifier`),
    v.adapter.address,
    `${circuit}: pool uses the intended adapter`,
  );
  const abi = artifact("MirkGroth16Adapter").abi;
  equal(
    await read(v.adapter.address, abi, "groth16"),
    v.groth16.address,
    `${circuit}: adapter uses the intended verifier`,
  );
  equal(await read(v.adapter.address, abi, "inputCount"), count, `${circuit}: public input count is correct`);
  equal(
    await read(v.adapter.address, abi, "verify", [`0x${"00".repeat(256)}`, Array(count).fill(1n)]),
    false,
    `${circuit}: zero proof is rejected`,
  );
}
for (const asset of [zeroAddress, "0x7E955252E15c84f5768B83c41a71F9eba181802F"])
  equal(await read(deployment.pool.address, poolAbi, "assetAllowed", [asset]), true, `${asset}: configured pool asset`);
equal(
  await read(deployment.memo.address, artifact("MirkPayMemo").abi, "pool"),
  deployment.pool.address,
  "memo: points to Mirk's pool",
);
equal(
  await read(deployment.registry.address, artifact("MirkAccountRegistry").abi, "owner"),
  deployment.deployer,
  "registry: intended owner",
);
equal(
  await read(deployment.registry.address, artifact("MirkAccountRegistry").abi, "registrar"),
  process.env.REGISTRAR_ADDRESS,
  "registry: intended registrar",
);
const poseidon = await buildPoseidon();
for (const pair of [
  [0n, 0n],
  [1n, 2n],
  [123n, 456n],
]) {
  const expected = poseidon.F.toObject(poseidon(pair));
  const abi = [
    {
      type: "function",
      name: "poseidon",
      stateMutability: "pure",
      inputs: [{ type: "uint256[2]", name: "inputs" }],
      outputs: [{ type: "uint256", name: "hash" }],
    },
  ];
  equal(
    await read(deployment.poseidon.address, abi, "poseidon", [pair]),
    expected,
    "Poseidon: on-chain hash matches the circuit library",
  );
}
const report = {
  chainId: 46630,
  pool: deployment.pool.address,
  checkedAt: new Date().toISOString(),
  checks,
  sourceVerification: "Bytecode and immutable wiring checked. Explorer source verification is separate.",
};
writeFileSync("deployments/mirk-testnet-verification.json", JSON.stringify(report, null, 2) + "\n");
console.warn(`${checks.length} on-chain deployment checks passed.`);
