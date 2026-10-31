import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const d = JSON.parse(readFileSync("deployments/mirk-testnet.json", "utf8"));
const entries = [
  ...Object.entries(d.verifiers).flatMap(([circuit, v]) => [
    [`src/generated/${circuit}.sol:Mirk${circuit[0].toUpperCase() + circuit.slice(1)}Verifier`, v.groth16],
    ["src/MirkGroth16Adapter.sol:MirkGroth16Adapter", v.adapter],
  ]),
  ["src/MirkShieldedPool.sol:MirkShieldedPool", d.pool],
  ["src/MirkPayMemo.sol:MirkPayMemo", d.memo],
  ["src/MirkAccountRegistry.sol:MirkAccountRegistry", d.registry],
];
const results = [];
for (const [contract, deployment] of entries) {
  const out = spawnSync(
    process.env.FORGE_BIN || "forge",
    [
      "verify-contract",
      "--root",
      "contracts",
      "--chain",
      "46630",
      "--verifier",
      "sourcify",
      "--watch",
      "--creation-transaction-hash",
      deployment.hash,
      deployment.address,
      contract,
    ],
    { encoding: "utf8", timeout: 90_000 },
  );
  const output = `${out.stdout || ""}\n${out.stderr || ""}`;
  const result = { contract, address: deployment.address, success: out.status === 0, output };
  results.push(result);
  writeFileSync(
    "deployments/mirk-testnet-source-verification.json",
    JSON.stringify({ chainId: 46630, checkedAt: new Date().toISOString(), results }, null, 2) + "\n",
  );
  console.warn(`${contract} ${deployment.address}: ${result.success ? "verified" : "verification failed"}`);
  if (!result.success) console.warn(output.slice(-1500));
}
if (results.some((r) => !r.success)) process.exitCode = 1;
