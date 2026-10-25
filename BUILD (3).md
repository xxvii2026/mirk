# BUILD.md — MIRK

Build MIRK end-to-end as a production-quality Robinhood Chain testnet application in one uninterrupted implementation pass.

Do not stop after scaffolding. Do not ask for approval between sections. Do not leave core flows as placeholders. Inspect installed package exports and official documentation before using APIs; never invent SDK functions. Continue until the application builds, tests pass, the contracts are deployed or deployment-ready, and the Vercel deployment is healthy.

If a credential is genuinely required, ask for every missing value once at the beginning. The only expected user-provided value is `NEXT_PUBLIC_REOWN_PROJECT_ID`. Generate throwaway testnet deployer and registrar wallets locally if they do not already exist. Never print their private keys, commit them, or place them in client-side environment variables.

---

## Product

**MIRK**  
**Private money for the open economy.**

MIRK is a private-money interface built on the Gloam shielded pool on Robinhood Chain testnet. Users connect a normal EVM wallet, add test funds to a private balance, receive a bank-like numeric MIRK account number, transfer privately to other MIRK accounts, create claim links, and cash out to a public wallet.

MIRK does not custody funds. Tokens sit in Gloam's deployed shielded-pool contract. The user's locally held note secrets provide spending authority. MIRK must never receive, upload, log, or persist those secrets on a server.

Anything that requires mainnet or a real commercial provider must visibly say **Coming soon**. Do not fake Marketplace purchases or private swaps.

### Testnet scope

Implement fully:

- Wallet connection through Reown AppKit
- Robinhood Chain testnet detection and switching
- Shield test assets into a real Gloam private balance
- Encrypted local note and receive-key storage
- Numeric MIRK account numbers
- Private MIRK-to-MIRK transfers
- Incoming-payment discovery
- Claim-link creation and claiming
- Cash out to a public EVM address
- Private local activity history
- Encrypted backup export and restore
- Responsive light and dark interfaces

Display as **Coming soon**:

- Trade
- Marketplace
- Prepaid cards
- Real gift cards
- Mainnet

---

## Non-negotiable truths

- Use real Gloam testnet contracts and real browser-generated Groth16 proofs.
- Do not simulate successful shielding, transfers, claims, cash outs, balances, transaction hashes, or confirmations.
- Never label a transaction successful until the receipt is confirmed on Robinhood Chain testnet.
- Never expose note secrets, receive private keys, decrypted activity, wallet signatures, or claim secrets to any backend.
- Never store private financial data in analytics, logs, query strings, crash reports, cookies, or plaintext browser storage.
- A private balance is derived from locally decrypted, unspent notes. It is not an API number or database balance.
- The public wallet balance and private MIRK balance must be visually and technically distinct.
- Use plain financial language in the UI. Say “Private balance,” “Add money,” “Send privately,” “Claim link,” and “Cash out.” Avoid “UTXO,” “nullifier,” “witness,” and “Merkle path” in normal user-facing copy.
- Clearly label the application **Testnet** and state that test assets have no value.

---

## Technical foundation

Use a pnpm workspace with current stable, mutually compatible versions:

- Next.js App Router
- React
- TypeScript in strict mode
- Tailwind CSS
- shadcn/ui primitives where useful, restyled to match MIRK
- Reown AppKit
- wagmi
- viem
- `@gloamtrade/sdk` latest stable
- `snarkjs`
- IndexedDB through Dexie or an equally small typed wrapper
- Zod for runtime validation
- Zustand only if global client state materially simplifies the app
- Foundry for the MIRK account registry contract
- Vitest for unit tests
- Playwright for end-to-end tests
- ESLint and Prettier

Do not add Supabase, a custom database, a second wallet SDK, a second component system, or unnecessary infrastructure.

### Network

Robinhood Chain testnet:

```text
Chain ID: 46630
Currency: ETH
RPC: https://rpc.testnet.chain.robinhood.com
Explorer: https://explorer.testnet.chain.robinhood.com
```

Use the network configuration exported by the Gloam SDK where available. Do not duplicate SDK constants unless a UI-only fallback is required.

### Gloam integration

Use `GLOAM_NETWORKS.robinhood` and the pool/configuration shipped by the installed SDK. The expected testnet pool at the time this specification was written is:

```text
0x72406D9597807A46f730d8b4fDBC5aC45Dc1d740
```

Treat the installed SDK as authoritative if the address or deployment metadata has changed.

At implementation time:

1. Install the latest stable SDK.
2. Inspect its exports, TypeScript definitions, package examples, and official docs.
3. Use supported builders for shield, private send, unshield, receive-key generation, payment discovery, Merkle synchronization, proof artifacts, and relay submission.
4. Do not use legacy plain `shield()` paths if the current pool requires a bound shield proof.
5. Do not use the retired sealed-trade builder.
6. Load circuit artifacts through the SDK's official artifact URL helpers and verify integrity when the SDK exposes hashes.
7. Generate proofs in a Web Worker so the interface remains responsive.
8. Cache synchronized tree data and deployment progress locally, while treating chain events as the source of truth.

If an exact function name differs from documentation, adapt to the installed SDK instead of building a fake wrapper around a nonexistent call.

---

## Repository structure

Use a clear structure similar to:

```text
app/
  page.tsx
  app/
    layout.tsx
    page.tsx
    send/page.tsx
    receive/page.tsx
    activity/page.tsx
    trade/page.tsx
    marketplace/page.tsx
    settings/page.tsx
  claim/page.tsx
  api/
    accounts/register/route.ts
components/
  brand/
  dashboard/
  money/
  privacy/
  shared/
contracts/
  src/MirkAccountRegistry.sol
  script/Deploy.s.sol
  test/MirkAccountRegistry.t.sol
lib/
  account-number/
  crypto-store/
  gloam/
  reown/
  robinhood/
  validation/
workers/
  prover.worker.ts
public/
  brand/
tests/
  e2e/
  unit/
```

Keep protocol integration logic outside React components. Components call typed application services/hooks; they must not assemble raw proofs or contract calldata inline.

---

## Brand and interface

The visual direction is inspired by Gloam's restrained, premium financial atmosphere, but MIRK must be visibly original.

### Logo

The primary logo is the complete uppercase word **MIRK**, not a separate letter-M icon.

Create an original SVG wordmark:

- Custom geometric uppercase letters
- Constructed from compact modular forms
- Sharp diagonal cuts and deliberate negative space
- Tight but readable spacing
- Solid one-colour artwork
- Black version for light surfaces
- White version for dark surfaces
- No gradient, glow, bevel, shadow, trademark symbol, or separate subtitle
- Do not trace or reproduce another company's mark

If `mirkkkkkk.gif` or another user-supplied wordmark reference exists in the repository, use it only as visual direction. Do not ship the GIF as the final logo. Rebuild an original, crisp SVG wordmark.

Also derive a favicon/app icon from the most distinctive geometric portion of the MIRK wordmark, while retaining the full wordmark as the primary brand.

### Typography

Gloam uses Aeonik, but do not bundle unlicensed font files. Use this order:

1. If licensed Aeonik files are present under `public/fonts`, configure them locally.
2. Otherwise use a locally bundled open-source close alternative such as Instrument Sans or Satoshi.

Use only three weights:

- 300 for large balances and display text
- 400 for body text
- 500 for buttons, labels, and emphasis

Use tabular figures for balances and account numbers. Never render balances in bold. Avoid monospace in the product UI.

### Colour system

Use a quiet neutral system with a restrained MIRK-specific cold-violet signal:

```text
Ink:          #0B0C0F
Night:        #07080A
Paper:        #FFFFFF
Soft ground:  #F3F4F6
Hairline:     #E3E5E8
Muted text:   #62666D
MIRK signal:  #766FE8
Signal tint:  #EFEEFF
Signal dark:  #AAA5FF
```

The accent must stay below roughly five percent of any screen. Use it for privacy status, focus, success/verification glints, and selected states. Do not make entire pages or primary buttons violet.

### Interface rules

- Light and dark modes must both be first-class.
- Cards float gently on soft neutral ground.
- Borders are thin and cool; shadows are extremely subtle or absent.
- Use generous whitespace and calm transitions.
- One strong near-black/near-white primary action per view.
- Secondary actions are ghost buttons or quiet text links.
- Large balances are light-weight and use tabular figures.
- Hidden balances use a short row of dots, not blur or black bars.
- Prefer sentence case.
- Do not use neon crypto aesthetics, glassmorphism, purple gradients, token-price tickers, candlestick charts, generic blockchain cubes, or excessive animation.
- Respect `prefers-reduced-motion`.
- Fully support desktop and mobile widths.

### Voice

Calm, plain and precise. No hype copy.

Good:

- “Your private balance”
- “Only you can see this amount.”
- “Send privately”
- “Nobody, including MIRK, can move your money.”
- “This payment is being proved on your device.”

Avoid:

- “Revolutionary privacy”
- “Untraceable money”
- “Anonymous banking”
- “Military-grade privacy”

---

## Pages and flows

### Landing page

Build a restrained public page with:

- MIRK wordmark
- Hero: “Private money for the open economy.”
- Short explanation: hold, send and receive without exposing balances or amounts publicly
- “Open MIRK” primary action
- A compact “What the public sees / What you see” comparison
- Product pillars: Private balance, MIRK transfers, Claim links
- Honest testnet and Gloam infrastructure disclosure
- Footer links for Docs, Contracts, Privacy and Risk

Do not create a huge marketing page. Keep it focused and premium.

### First connection and private-store setup

1. Connect through Reown.
2. Confirm or switch to Robinhood Chain testnet.
3. Ask the user to sign a fixed, domain-separated message locally to unlock their private store.
4. Never submit this signature to a backend.
5. Derive a key-encryption key using SHA-256/HKDF from the signature and domain context.
6. Generate a random 256-bit vault key.
7. Encrypt note records, receive private keys, claim metadata, and private activity with AES-GCM.
8. Store only ciphertext, IVs, versions, and non-sensitive synchronization metadata in IndexedDB.

Use a versioned message such as:

```text
Unlock MIRK private storage
Chain: 46630
Version: 1

This signature stays on this device and does not authorize a transaction.
```

Do not pretend wallet signatures are a perfect recovery system. Provide encrypted export and restore.

### Dashboard

Show:

- Testnet status pill
- Private balance with show/hide control
- Asset selector for assets actually supported by the SDK testnet configuration
- MIRK account number with copy action
- Receive QR code containing the MIRK account number, not a public wallet address
- Primary actions: Add money, Send, Receive, Cash out
- Recent private activity from the encrypted local store
- Compact privacy explanation
- Trade and Marketplace navigation entries labelled Coming soon

Do not invent USD values when no trustworthy testnet price exists. Display native asset units.

### Add money

Implement the real bound-shield flow supported by the current Gloam pool:

1. Select a supported test asset.
2. Show connected public-wallet balance.
3. Enter amount and validate limits.
4. For ERC-20 assets, request approval only when required.
5. Generate the note and shield proof on-device.
6. Persist the note secret encrypted before broadcasting whenever the SDK's safe flow permits.
7. Submit the exact SDK-built transaction.
8. Wait for confirmation.
9. Synchronize the tree and update private balance.

Show explicit progress:

- Preparing private note
- Generating proof
- Awaiting wallet
- Confirming on Robinhood Chain
- Added to private balance

On failure, preserve recoverable state and give a truthful retry path.

### MIRK account numbers

Users receive a 12-digit bank-like number rendered in groups:

```text
4829 1630 7714
```

Rules:

- First 11 digits are cryptographically random.
- Final digit is a Luhn checksum.
- Preserve leading zeroes.
- Never derive the number from a wallet address, name, phone number, email, or public key.
- The registry resolves the number to a Gloam public receive tag/key only.
- The registry contains no name, profile, public wallet address, or balance.
- Validate checksum before any lookup.
- Show no recipient name or avatar after lookup. Show only a neutral “Valid MIRK account” confirmation.

### Account registry contract

Create a minimal non-upgradeable `MirkAccountRegistry.sol`:

- Stores account number to receive-tag bytes/string.
- Stores receive-tag hash to account number to prevent duplicate registration.
- Registration is allowed only from a dedicated registrar address.
- Existing registrations are immutable.
- Reject zero/invalid-range numbers, empty tags, duplicate numbers and duplicate tags.
- Emit `AccountRegistered(uint64 indexed accountNumber, bytes32 indexed receiveTagHash, bytes receiveTag)` or the closest gas-reasonable equivalent.
- No names, wallet addresses, balances, metadata, admin withdrawal, proxy or token.
- Ownership may rotate the registrar through an explicit event, but cannot edit registered accounts.
- Include comprehensive Foundry tests.

Deploy it to Robinhood Chain testnet using a fresh throwaway deployer wallet. Verify the source on the official explorer if verification is supported.

### Registration API

Implement a small server-only route that:

1. Accepts a proposed checksummed account number and Gloam receive tag.
2. Validates both strictly with Zod.
3. Confirms onchain that neither is registered.
4. Submits registration using the server-only registrar wallet.
5. Returns the transaction hash and waits or exposes confirmation status.

The route must not require the connected public wallet address, a name, email, signature, note secret, or receive private key.

Add basic abuse controls suitable for a public testnet endpoint. Never expose `REGISTRAR_PRIVATE_KEY` to client bundles or logs.

If automatic registration cannot be deployed because the agent lacks faucet funds or Vercel environment access, finish and test the code, output the public registrar address once, and give one precise manual action required. Do not replace registration with mock data.

### Send privately

1. Accept a 12-digit MIRK account number.
2. Normalize spaces, validate Luhn checksum, and resolve it from the onchain registry.
3. Display only “Valid MIRK account,” never a name.
4. Select asset and amount.
5. Perform local coin selection from unspent notes.
6. Generate proof(s) on-device through the supported Gloam SDK flow.
7. Create recipient and change notes correctly.
8. Submit through the SDK-supported relayer where available; otherwise clearly request the connected wallet to submit.
9. Confirm receipts and persist encrypted activity.

If the amount requires multiple input notes and the SDK only spends one note at a time, execute a safe, explicit sequence of real private sends or provide a real consolidation flow. Never display a combined success for operations that did not all confirm.

### Receive

Show:

- MIRK account number
- Copy button
- QR code
- Short explanation that no name or balance is revealed
- Background/manual inbox scan for encrypted incoming payment memos using the current Gloam SDK

When an incoming payment is discovered, import/sweep it as required by the SDK's ownership model before treating it as safely owned. Never count an unswept note as final if the payer could still know its spend secret.

### Claim links

Create links for recipients who do not yet have MIRK:

1. Generate an ephemeral receive key entirely in the browser.
2. Send a real private payment to the ephemeral receive tag.
3. Build a versioned claim package containing only the information needed to discover and sweep the payment.
4. Encrypt/encode it and place it after the URL `#` fragment.
5. Never send the claim secret to the server, analytics, or logs.

Example shape:

```text
https://<deployment>/claim#<versioned-secret-package>
```

Claim page:

- Parse the fragment client-side and immediately remove sensitive display from the visible URL where safe.
- Validate version and integrity.
- Discover the real payment.
- Let an existing user sweep it into their MIRK account.
- Let a new user create a MIRK receive key/account and sweep it.
- Permit public cash out only if the Gloam SDK supports the required safe sweep/unshield path.
- Explain that anyone holding the complete link may claim it.
- Never mark a link claimed based only on local state.

### Cash out

1. Enter and checksum-validate a destination EVM address.
2. Select asset and amount.
3. Clearly show that destination and amount become public.
4. Generate the real unshield proof locally.
5. Submit and wait for confirmation.
6. Create/preserve change correctly.
7. Link to the confirmed explorer transaction.

### Activity

Store human-readable private activity encrypted on-device:

- Added money
- Sent privately
- Received privately
- Claim link created
- Claim link swept
- Cashed out

Show amount, asset, local timestamp, status and transaction hash where relevant. Do not infer recipient names. Provide a rescan/reconcile action against chain state.

### Trade and Marketplace

Create polished pages consistent with the app shell, containing only:

- Feature title
- One-sentence explanation
- “Coming soon” status
- No fake catalogue, fake balances, fake quotes, disabled checkout forms, mock cards, pretend integrations or simulated transaction buttons

Trade copy must not imply the retired SDK swap path works on testnet. Marketplace copy may mention future gift cards, airtime and eSIMs without naming an unconfirmed provider.

### Settings

Include:

- Theme: Light, Dark, System
- Network and contract information
- Explorer links
- Hide/show balance preference
- Lock private store
- Export encrypted backup
- Restore encrypted backup
- Rescan shielded pool
- Disconnect wallet
- Clear local MIRK data with a serious confirmation

Export files must be versioned, encrypted and contain no plaintext notes or receive private keys.

---

## Reliability and privacy engineering

- Use a dedicated Web Worker for proof generation.
- Cancel or recover gracefully when a wallet request is rejected.
- Make transaction actions idempotent where possible.
- Persist pending intent metadata without storing plaintext secrets.
- Reconcile pending transactions after reload.
- Validate chain ID before every write.
- Use checksummed addresses and bigint-safe amount handling.
- Never use JavaScript floating-point numbers for token values.
- Pin or validate circuit artifacts according to the SDK's integrity mechanism.
- Keep all external links protected with appropriate `rel` attributes.
- Add a strict Content Security Policy compatible with Reown, RPC and circuit artifact hosts.
- Disable sensitive request/response logging.
- Do not install user-tracking analytics.
- Add friendly warnings when IndexedDB/private storage is unavailable.
- Ensure the app never renders decrypted secrets into the DOM.

---

## Environment variables

Create `.env.example` with no real secrets:

```env
NEXT_PUBLIC_REOWN_PROJECT_ID=
NEXT_PUBLIC_RH_RPC_URL=https://rpc.testnet.chain.robinhood.com
NEXT_PUBLIC_ACCOUNT_REGISTRY_ADDRESS=

# Server/deployment only. Never prefix with NEXT_PUBLIC.
DEPLOYER_PRIVATE_KEY=
REGISTRAR_PRIVATE_KEY=
```

Generate `.env.local` only locally and ensure it is ignored by Git. Never commit `.env*` except `.env.example`.

If using the public Robinhood testnet RPC causes rate limits, support an optional dedicated RPC URL without making it mandatory.

---

## Testing

### Contract tests

Cover:

- Successful registration
- Duplicate number rejection
- Duplicate receive-tag rejection
- Unauthorized registration rejection
- Empty/invalid input rejection
- Registrar rotation
- Immutability of existing mappings
- Lookup behavior

### Unit tests

Cover:

- Account-number generation
- Luhn checksum validation
- Formatting and normalization
- Amount parsing/formatting
- Encrypted-store round trips
- Wrong-key decryption failure
- Backup export/restore
- Claim-fragment parsing and integrity failure
- Note-selection logic
- Network guards

### Integration/E2E tests

Use mocked wallet/provider boundaries only in automated browser tests. The shipped application must use real contracts.

Cover:

- Connect-wallet screen
- Wrong-network state
- Private-store unlock
- Account-number registration UI
- Dashboard balance hiding
- Send validation
- Cash-out privacy warning
- Claim-link malformed/valid states
- Coming-soon pages contain no actionable fake controls
- Responsive navigation
- Light/dark mode

When testnet funds are available, also run one real smoke flow:

```text
connect → shield small amount → private send → recipient discovery/sweep → cash out
```

Record actual transaction hashes in a local deployment report, not hard-coded into the app.

---

## Accessibility and quality

- Meet WCAG AA contrast.
- Full keyboard navigation.
- Visible focus states.
- Correct form labels and error associations.
- Respect reduced-motion preferences.
- Minimum 44px touch targets on mobile.
- Skeletons/progress indicators must communicate real state.
- No layout shift when balances load.
- No horizontal overflow at 320px width.
- Use semantic HTML and meaningful page titles.

---

## Deployment

1. Generate fresh test-only deployer and registrar wallets if absent.
2. Store keys locally and server-side only.
3. Output public addresses without exposing private keys.
4. If faucet interaction requires a CAPTCHA, ask once for the user to fund the displayed public addresses, then continue automatically after funding.
5. Deploy and test `MirkAccountRegistry` on Robinhood Chain testnet.
6. Update `NEXT_PUBLIC_ACCOUNT_REGISTRY_ADDRESS`.
7. Build and run all tests.
8. Deploy through the repository's connected Vercel project if authenticated.
9. Verify the live site loads, connects to chain `46630`, and exposes no source maps or secrets containing private material.

Do not deploy to mainnet.

---

## Required documentation

Create a concise `README.md` containing:

- What MIRK does
- Testnet warning
- Architecture overview
- Gloam dependency and where funds sit
- Local setup
- Environment variables
- Contract deployment
- Testing
- Privacy boundaries
- Backup/recovery warning
- Deployed URLs and contract addresses

Create `SECURITY.md` containing:

- No external audit claim
- Responsible disclosure contact placeholder
- Note-secret threat model
- Browser/device compromise risk
- Claim-link bearer risk
- Testnet-only status
- Explicit statement that privacy depends on anonymity-set size and transaction timing

Create `DEPLOYMENT.md` with exact verified deployment details after deployment.

---

## Completion criteria

The task is complete only when all of the following are true:

- Application compiles with zero TypeScript errors.
- Lint passes.
- Unit and contract tests pass.
- Production build passes.
- No secret is committed or exposed to the client bundle.
- Real Gloam testnet shielding works when funded.
- Private balance comes from encrypted local notes.
- Numeric MIRK account registration and resolution use the deployed registry.
- A MIRK account transfer uses a real Gloam private payment.
- Claim secrets remain in the URL fragment and client only.
- Cash out uses a real proof and confirmed transaction.
- Trade and Marketplace honestly show Coming soon.
- Mobile and desktop interfaces are polished in light and dark mode.
- The primary logo is the full custom geometric MIRK wordmark.
- README, SECURITY and DEPLOYMENT documentation are present.
- The final response reports the live URL, contract addresses, tests run, actual testnet transactions completed, and any single remaining external blocker.

When something cannot be completed because of an external permission, faucet or credential, finish everything else and report exactly one concrete action needed from the user. Do not replace blocked functionality with a mock and do not stop early.
