import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
export function protocolFingerprint() {
  const hash = createHash("sha256");
  function visit(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const name = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "build") visit(name);
      } else if (/\.(sol|circom)$/.test(name)) hash.update(name).update(readFileSync(name));
    }
  }
  visit("contracts/src");
  visit("contracts/circuits");
  hash.update(readFileSync("lib/shielded/artifact-manifest.json"));
  return hash.digest("hex");
}
