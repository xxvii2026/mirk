// Mirk's local, single-party TESTNET ceremony. Never use these keys for real funds.
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

if (existsSync("deployments/mirk-testnet.json"))
  throw new Error("A pool is already deployed. Restore its original artifacts; do not generate replacement keys.");

const build = resolve("contracts/circuits/build");
const publish = resolve("public/circuits");
const generated = resolve("contracts/src/generated");
for (const dir of [build, publish, generated]) mkdirSync(dir, { recursive: true });
if (existsSync(`${build}/ceremony-complete.json`))
  throw new Error("Keys already exist. Keep the deployed key set; use a fresh checkout for a new ceremony.");
function run(bin, args) {
  const out = spawnSync(bin, args, { stdio: "inherit" });
  if (out.status !== 0) throw new Error(`${bin} failed (${out.status}).`);
}
const snark = (...args) => run("node_modules/.bin/snarkjs", args);
const hash = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const manifest = { protocol: "mirk-shielded-v1", testnetOnly: true, circuits: {} };
// Fresh randomness for both phases. Intermediate keys never enter public/.
snark("powersoftau", "new", "bn128", "14", `${build}/initial.ptau`);
snark(
  "powersoftau",
  "contribute",
  `${build}/initial.ptau`,
  `${build}/contributed.ptau`,
  "--name=Mirk testnet",
  `-e=${randomBytes(64).toString("hex")}`,
);
snark("powersoftau", "prepare", "phase2", `${build}/contributed.ptau`, `${build}/prepared.ptau`);
for (const circuit of ["shield", "transfer", "unshield"]) {
  run("node_modules/.bin/circom2", [
    `contracts/circuits/${circuit}.circom`,
    "--r1cs",
    "--wasm",
    "--sym",
    "-l",
    "node_modules",
    "-o",
    build,
  ]);
  snark("groth16", "setup", `${build}/${circuit}.r1cs`, `${build}/prepared.ptau`, `${build}/${circuit}_initial.zkey`);
  snark(
    "zkey",
    "contribute",
    `${build}/${circuit}_initial.zkey`,
    `${build}/${circuit}.zkey`,
    "--name=Mirk testnet",
    `-e=${randomBytes(64).toString("hex")}`,
  );
  snark("zkey", "verify", `${build}/${circuit}.r1cs`, `${build}/prepared.ptau`, `${build}/${circuit}.zkey`);
  snark("zkey", "export", "verificationkey", `${build}/${circuit}.zkey`, `${build}/${circuit}.vkey.json`);
  snark("zkey", "export", "solidityverifier", `${build}/${circuit}.zkey`, `${generated}/${circuit}.sol`);
  const verifier = `${generated}/${circuit}.sol`;
  writeFileSync(
    verifier,
    readFileSync(verifier, "utf8").replace(
      "contract Groth16Verifier",
      `contract Mirk${circuit[0].toUpperCase() + circuit.slice(1)}Verifier`,
    ),
  );
  const files = {
    wasm: `${build}/${circuit}_js/${circuit}.wasm`,
    zkey: `${build}/${circuit}.zkey`,
    verificationKey: `${build}/${circuit}.vkey.json`,
  };
  manifest.circuits[circuit] = {};
  for (const [kind, file] of Object.entries(files)) {
    const digest = hash(file);
    const ext = kind === "wasm" ? "wasm" : kind === "zkey" ? "zkey" : "vkey.json";
    const name = `${circuit}-${digest.slice(0, 16)}.${ext}`;
    copyFileSync(file, `${publish}/${name}`);
    manifest.circuits[circuit][kind] = { url: `/circuits/${name}`, sha256: digest };
  }
}
writeFileSync("lib/shielded/artifact-manifest.json", JSON.stringify(manifest, null, 2) + "\n");
writeFileSync(`${build}/ceremony-complete.json`, JSON.stringify(manifest, null, 2) + "\n");
console.warn(
  "Mirk testnet artifacts generated. Compile contracts, then run the real-proof integration test before deploying.",
);
