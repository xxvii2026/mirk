# Mirk

**Private money for the open economy.**

Mirk is building an independent shielded payments stack on **Robinhood Chain testnet**: its own pool, circuits, proving artifacts, locally maintained SDK, encrypted memo board, account registry and relay.

Mirk's independent stack is deployed on Robinhood Chain testnet. This branch no longer uses Gloam's contracts, package, relay or services at runtime. See [POOL_MIGRATION.md](POOL_MIGRATION.md) for architecture, validation, deployment and recovery of legacy testnet funds.

Test assets have no value. Mirk has not been externally audited. Some locally maintained primitives derive from MIT-licensed upstream code; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Architecture

```text
contracts/src/MirkShieldedPool.sol   immutable payments-only pool
contracts/src/MirkPayMemo.sol        encrypted discovery board
contracts/src/MirkGroth16Adapter.sol packed-proof adapters
contracts/circuits/                 Mirk shield / transfer / unshield circuits
lib/shielded/sdk/                   locally maintained note, witness and payment code
lib/shielded/                       service flows, tree sync, worker bridge, manifest, relay sender
workers/prover.worker.ts            local proving with Mirk-hosted hash-verified files
scripts/shielded/                   independent ceremony and deployment pipeline
app/api/relay/                      Mirk's gas sponsor; no upstream relay
lib/registry/                      Mirk account-number registration and lookup
lib/crypto-store/                  encrypted, pool-scoped browser storage and backups
```

## Local setup

Requirements: Node 20+, pnpm 12, Foundry (for contracts).

```bash
pnpm install
cp .env.example .env.local    # fill in NEXT_PUBLIC_REOWN_PROJECT_ID (and registry/registrar to register accounts)
pnpm dev
```

## Deployment configuration

See [.env.example](.env.example) for the verified Mirk pool, memo board and account registry, plus the Reown project and server-only registrar/relayer keys. Missing Mirk pool configuration blocks payments. See [DEPLOYMENT.md](DEPLOYMENT.md) for the deployment record and [POOL_MIGRATION.md](POOL_MIGRATION.md) for the reproducible build and deployment sequence.

## Testing

```bash
pnpm typecheck && pnpm lint
pnpm test                     # Vitest unit tests
LIVE=1 pnpm test              # also rebuilds the real pool tree and checks its root
pnpm contracts:test           # Foundry
pnpm build && pnpm test:e2e   # Playwright, desktop + mobile, mocked wallet boundary
E2E_BASE_URL=https://mirk-two.vercel.app pnpm test:e2e   # same suite against a deployment
SMOKE=1 pnpm exec playwright test smoke --project=desktop  # real testnet flows, needs a funded DEPLOYER_PRIVATE_KEY
```

Browser tests replace only the wallet UI (an injected EIP-1193 provider that signs with a local key). The smoke tests broadcast real transactions; their hashes are written to `deployments/local-report.md` (git-ignored), never into the app.

## Privacy boundaries

- **On your device only:** note secrets, receive private keys, claim links you created, private activity, the unlock signature. Encrypted with AES-GCM; record ids are random and record kinds are inside the ciphertext.
- **Mirk servers see:** an account number and its public receive tag at registration; already-public proof data when relaying. No logs are kept. Hosting sees IP addresses.
- **Public on chain:** deposits (wallet, asset, amount), cash outs (destination, asset, amount), and that a private transfer happened. On Robinhood testnet the memo board posts through the relay, so the sender's wallet does not appear.
- No analytics or trackers. The Coinbase and Base SDK connectors are disabled because they send telemetry.

## Backup and recovery

Your private balance can only be spent with keys stored in this browser. The wallet signature unlocks them on this device, but it is not a recovery method on its own: some wallets do not sign deterministically, and clearing site data deletes the keys. **Export an encrypted backup from Settings** (PBKDF2-SHA256 600k iterations, AES-GCM) and keep the passphrase separately. Nobody, including Mirk, can recover lost keys.

See [SECURITY.md](SECURITY.md) and [DEPLOYMENT.md](DEPLOYMENT.md).
