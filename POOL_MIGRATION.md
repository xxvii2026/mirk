# Mirk shielded pool migration

This branch replaces Gloam's runtime with a Mirk-maintained payments protocol. The independent testnet pool was deployed and verified on 2026-10-30; addresses and verification reports are recorded in [DEPLOYMENT.md](DEPLOYMENT.md) and `deployments/`. With no Mirk deployment configured, the app deliberately shows a pending screen.

## Ownership and dependencies

Mirk owns the pool source, three circuit sources, generated verifiers and proving keys, TypeScript note/witness code, memo board, account registry, and gas-sponsored relay. The app makes no requests to Gloam and imports no Gloam package. It uses standard Circom/circomlib, circomlibjs, snarkjs, viem, Robinhood RPC and Reown wallet connections.

Some locally maintained SDK and Merkle code derives from MIT-licensed Gloam source. That attribution is retained in THIRD_PARTY_NOTICES.md. Operational independence does not imply novel cryptography or erase upstream copyrights.

## Protocol

- BN254 Groth16 proofs; Poseidon note commitments and nullifiers; a depth-20 Merkle tree.
- Commitment = Poseidon(secret, amount, asset); nullifier = Poseidon(secret, commitment).
- Shield proofs bind the deposited amount and asset to the commitment.
- Transfer proofs consume one note and create a payment and change note of the same asset. All amounts are constrained to 128 bits, preventing field-wrap inflation.
- Withdrawal proofs bind root, nullifier, asset, full note amount and recipient. Partial withdrawals first split a note privately.
- The pool verifies every proof, rejects reused nullifiers and duplicate/noncanonical commitments, tracks asset backing, and rejects deposits whose token balance delta differs from the amount.
- Verifiers, hasher and supported assets are immutable. The pool has no owner, upgrade, fee or withdrawal override. Contracts refuse deployment outside chain 46630 or local chain 31337.
- Standard primitives do not make this implementation audited. The local single-party ceremony is **testnet-only**, including its entropy lifecycle. Mainnet needs a separately reviewed design, independent security review and appropriate setup ceremony.

## Build and validate

From a fresh checkout with Node 24, pnpm and Foundry on PATH:

```sh
pnpm install --frozen-lockfile
pnpm circuits:build
forge build --root contracts
forge test --root contracts
pnpm typecheck
pnpm test
FORGE_BIN=forge ANVIL_BIN=anvil pnpm pool:test
pnpm build
```

The circuit build compiles Mirk's own Circom sources, generates fresh local phase-1 and phase-2 contributions, verifies the final zkeys and exports Solidity verifiers. Intermediate setup files stay under ignored `contracts/circuits/build/`. Only final, content-addressed wasm, zkey and verification-key files enter the tracked `public/circuits/` directory; their full SHA-256 hashes are pinned in the app's manifest. Preserve these exact validated files in Mirk-controlled artifact storage as well. Never regenerate keys for a pool that is already deployed.

`pool:test` deploys an actual Poseidon hasher, generated Groth16 verifiers, adapters, pool and memo board to disposable Anvil. It proves and executes real flows and checks that altered proofs, deposit amounts, withdrawal recipients and reused nullifiers fail. Unit-test verifiers are explicitly doubles; they are never part of the deployment script.

## Deployment

Deployment is explicit and spends testnet gas. The script has no default private key and refuses mainnet. Use dedicated funded testnet keys; never place them in `NEXT_PUBLIC_*` variables.

```sh
# Export DEPLOYER_PRIVATE_KEY, REGISTRAR_ADDRESS and optionally NEXT_PUBLIC_RH_RPC_URL securely.
pnpm pool:deploy --plan       # review public addresses and the validated protocol fingerprint
pnpm pool:deploy --broadcast
```

The script deploys Mirk's own Poseidon contract, three generated verifiers and adapters, immutable pool, memo board and a fresh registry. It prints public environment configuration and writes `deployments/mirk-testnet.json`. Configure all four pool/memo address and deployment-block variables plus the fresh registry in `.env.example`; do not reuse the legacy registry with different receive-key formats. Set server-only registrar and relayer keys separately. Fund the relayer and verify every deployed source, address, verifier, asset and artifact hash before allowing deposits.

The relay simulates calls with gas estimation, uses only configured contracts, limits gas and gas price, serializes submissions, bounds its in-process queue and rate-limits requests. It cannot change proof-bound recipients. **Run a single dedicated signer process per relayer key.** Its queue, budget and IP limits are process-local; an autoscaled/serverless deployment needs a durable shared transaction queue and distributed budgets before scaling. The initial relay is suitable for controlled testnet use, not an unrestricted production sponsor.

## Existing accounts and funds

An old-pool note is not a claim on the new pool. There is no automatic private migration or shared anonymity set.

1. Before publishing the new build, keep the previous build available on the original origin so users can export encrypted backups and cash out old testnet funds.
2. Keep the old deployment, old proving files and old backups available for recovery. Do not delete or rewrite legacy browser records.
3. Deploy and verify the Mirk stack, then create new Mirk identities/account numbers and deposit into the new pool explicitly.
4. Private store IDs now include the pool address. Backups are v2 with the pool and chain authenticated inside the encrypted payload. A different pool's backup is refused before any records are merged.
5. Receive tags, encrypted tickets and note packages use Mirk prefixes/domain separation. New claim links are `m2` and include the pool and chain; old `m1` links are refused rather than searched against the new pool.

Changing an address in an environment variable does not transfer funds. Exporting a backup does not move funds either. Existing legacy funds remain governed by the original protocol until their owner withdraws them there.
