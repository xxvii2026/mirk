# MIRK

**Private money for the open economy.**

MIRK is a private-money interface on the [Gloam](https://gloam.trade) shielded pool on **Robinhood Chain testnet**. Connect any EVM wallet, add test funds to a private balance, get a 12-digit MIRK account number, send privately to other MIRK accounts, create claim links, and cash out to a public wallet.

> **Testnet only.** Test assets have no value. MIRK has not been externally audited. Trade, Marketplace, prepaid cards, real gift cards and mainnet are shown as *Coming soon*.

- Live: **https://mirk-two.vercel.app**
- Account registry: [`0x1882fE79FbBE790305665851635E6810c3E82569`](https://explorer.testnet.chain.robinhood.com/address/0x1882fE79FbBE790305665851635E6810c3E82569) (Sourcify exact match)
- Gloam pool (from `@gloamtrade/sdk` 0.2.2): [`0x72406D9597807A46f730d8b4fDBC5aC45Dc1d740`](https://explorer.testnet.chain.robinhood.com/address/0x72406D9597807A46f730d8b4fDBC5aC45Dc1d740)

## Where the money sits

MIRK never custodies funds. Deposits go into Gloam's deployed shielded-pool contract. A private balance is a set of notes (`commitment = Poseidon(secret, amount, asset)`); the note secret is the only spend authority, and it lives encrypted in your browser. MIRK's servers never receive note secrets, receive keys, signatures, claim secrets or decrypted activity.

## Architecture

```
app/                  Next.js App Router pages
  page.tsx            landing
  app/*               dashboard, add, send, receive, cash-out, activity, settings, trade, marketplace
  claim/              claim-link page (secret lives in the URL fragment only)
  api/accounts/register  server-only registrar: publishes number -> receive tag
  api/relay           strict pass-through to the Gloam relay (public proof data only)
components/           UI (brand, dashboard, money, privacy, shared)
lib/
  account-number/     12-digit numbers: 11 random digits + Luhn
  crypto-store/       WebCrypto vault (HKDF from signature, AES-GCM), Dexie/IndexedDB, backups
  gloam/              SDK integration: services, tree sync, prover client, claim packages
  registry/           on-chain lookup (client) and registrar (server-only)
  robinhood/          network constants taken from the Gloam SDK
  validation/         amounts (bigint only), API schemas (Zod), rate limiting
workers/prover.worker.ts  Groth16 proving off the main thread, artifacts checked against SDK SHA-256
contracts/            Foundry: MirkAccountRegistry + tests + deploy script
tests/unit, tests/e2e Vitest and Playwright
```

Flows, all through supported `@gloamtrade/sdk` builders:

| Flow | SDK path | Submitted by |
| --- | --- | --- |
| Add money | `buildShieldBoundIntent` (bound shield proof) | your wallet |
| Send privately | `buildPrivateSendIntent`, payment note sealed with `sealToReceiveTag`, posted to the encrypted memo board | Gloam relay (wallet fallback on request) |
| Receive | `scanIncomingPayments` then `sweepReceivedNote` into a fresh note only you know | Gloam relay |
| Claim link | private send to a one-time receive key whose private half is in the `#fragment` | Gloam relay |
| Cash out | optional private split, then `buildUnshieldIntent` | Gloam relay (wallet fallback on request) |

Each Gloam spend consumes exactly one note. Payments larger than any single note run as an explicit sequence of real transfers, each confirmed before the next, with partial progress reported truthfully.

## Local setup

Requirements: Node 20+, pnpm 12, Foundry (for contracts).

```bash
pnpm install
cp .env.example .env.local    # fill in NEXT_PUBLIC_REOWN_PROJECT_ID (and registry/registrar to register accounts)
pnpm dev
```

## Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_REOWN_PROJECT_ID` | client | Reown AppKit project |
| `NEXT_PUBLIC_RH_RPC_URL` | client | Optional dedicated RPC; defaults to the public Robinhood testnet RPC |
| `NEXT_PUBLIC_ACCOUNT_REGISTRY_ADDRESS` | client | Deployed `MirkAccountRegistry` |
| `REGISTRAR_PRIVATE_KEY` | server only | Throwaway testnet key allowed to register accounts |
| `DEPLOYER_PRIVATE_KEY` | local only | Throwaway testnet key that deployed the registry; not needed at runtime |

Never prefix a private key with `NEXT_PUBLIC`. `.env*` files other than `.env.example` are git-ignored.

## Contract deployment

```bash
cd contracts
forge test
REGISTRAR_ADDRESS=0x... forge script script/Deploy.s.sol \
  --rpc-url https://rpc.testnet.chain.robinhood.com --broadcast --private-key $DEPLOYER_PRIVATE_KEY
forge verify-contract <address> src/MirkAccountRegistry.sol:MirkAccountRegistry --verifier sourcify --chain 46630
```

The registry is non-upgradeable, holds no funds and stores only `accountNumber -> receiveTag` (and the reverse hash). Registrations are permanent; the owner can only rotate the registrar.

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
- **MIRK servers see:** an account number and its public receive tag at registration; already-public proof data when relaying. No logs are kept. Hosting sees IP addresses.
- **Public on chain:** deposits (wallet, asset, amount), cash outs (destination, asset, amount), and that a private transfer happened. On Robinhood testnet the memo board posts through the relay, so the sender's wallet does not appear.
- No analytics or trackers. The Coinbase and Base SDK connectors are disabled because they send telemetry.

## Backup and recovery

Your private balance can only be spent with keys stored in this browser. The wallet signature unlocks them on this device, but it is not a recovery method on its own: some wallets do not sign deterministically, and clearing site data deletes the keys. **Export an encrypted backup from Settings** (PBKDF2-SHA256 600k iterations, AES-GCM) and keep the passphrase separately. Nobody, including MIRK, can recover lost keys.

See [SECURITY.md](SECURITY.md) and [DEPLOYMENT.md](DEPLOYMENT.md).
