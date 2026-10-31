import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { protocolFingerprint } from "./fingerprint.mjs";
import { privateKeyToAccount } from "viem/accounts";
import { deployMirk } from "./deploy-lib.mjs";

if (!process.argv.includes("--broadcast") && !process.argv.includes("--plan"))
  throw new Error("Review POOL_MIGRATION.md, then pass --broadcast to deploy Mirk's testnet contracts.");
const rpc = process.env.NEXT_PUBLIC_RH_RPC_URL || "https://rpc.testnet.chain.robinhood.com";
const key = process.env.DEPLOYER_PRIVATE_KEY;
const registrar = process.env.REGISTRAR_ADDRESS;
if (!key || !registrar)
  throw new Error("Set DEPLOYER_PRIVATE_KEY and REGISTRAR_ADDRESS in the deployment environment.");
const manifest = JSON.parse(readFileSync("lib/shielded/artifact-manifest.json", "utf8"));
for (const circuit of ["shield", "transfer", "unshield"]) {
  const files = manifest.circuits[circuit];
  if (!files) throw new Error("Build Mirk circuits first.");
  for (const file of Object.values(files)) {
    const actual = createHash("sha256")
      .update(readFileSync(`public${file.url}`))
      .digest("hex");
    if (actual !== file.sha256) throw new Error("Artifact integrity failure.");
  }
}
if (existsSync("deployments/mirk-testnet.json"))
  throw new Error("Deployment record exists. Review it before deploying another pool.");
const validation = JSON.parse(readFileSync("contracts/circuits/build/validated.json", "utf8"));
if (!validation.realProofs || validation.protocolFingerprint !== protocolFingerprint())
  throw new Error("Run the real-proof test against these exact contracts and artifacts before deployment.");
if (process.argv.includes("--plan")) {
  console.warn(
    JSON.stringify(
      {
        chainId: 46630,
        deployer: privateKeyToAccount(key).address,
        registrar,
        relayer: process.env.MIRK_RELAYER_PRIVATE_KEY
          ? privateKeyToAccount(process.env.MIRK_RELAYER_PRIVATE_KEY).address
          : null,
        relayerFunding: "Separate funding required; no funds sent by this command",
        contractCount: 10,
        contracts: [
          "Poseidon2",
          "MirkShieldVerifier",
          "MirkTransferVerifier",
          "MirkUnshieldVerifier",
          "3 MirkGroth16Adapters",
          "MirkShieldedPool",
          "MirkPayMemo",
          "MirkAccountRegistry",
        ],
        protocolFingerprint: protocolFingerprint(),
        realProofsValidated: true,
        broadcast: false,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}
const compilation = spawnSync(process.env.FORGE_BIN || "forge", ["build", "--root", "contracts"], { stdio: "inherit" });
if (compilation.status !== 0) throw new Error("Contract compilation failed.");
const progressPath = "deployments/mirk-testnet-progress.jsonl";
if (existsSync(progressPath))
  throw new Error("Partial deployment journal exists. Recover its transactions before starting another deployment.");
mkdirSync("deployments", { recursive: true });
const result = await deployMirk({
  onTransaction: (event) => {
    appendFileSync(progressPath, JSON.stringify(event, (_k, v) => (typeof v === "bigint" ? v.toString() : v)) + "\n");
    console.warn(`Deployment ${event.status}: ${event.hash}${event.address ? ` -> ${event.address}` : ""}`);
  },
  rpc,
  key,
  chainId: 46630,
  registrar,
  assets: ["0x0000000000000000000000000000000000000000", "0x7E955252E15c84f5768B83c41a71F9eba181802F"],
});
mkdirSync("deployments", { recursive: true });
writeFileSync(
  "deployments/mirk-testnet.json",
  JSON.stringify({ ...result, manifest }, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2) + "\n",
);
console.warn(
  `NEXT_PUBLIC_MIRK_POOL_ADDRESS=${result.pool.address}\nNEXT_PUBLIC_MIRK_POOL_DEPLOY_BLOCK=${result.pool.block}\nNEXT_PUBLIC_MIRK_MEMO_ADDRESS=${result.memo.address}\nNEXT_PUBLIC_MIRK_MEMO_DEPLOY_BLOCK=${result.memo.block}\nNEXT_PUBLIC_ACCOUNT_REGISTRY_ADDRESS=${result.registry.address}`,
);
