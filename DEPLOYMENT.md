# Deployment

Verified on 2026-10-24.

## Live site

- Production: **https://mirk-two.vercel.app** (Vercel project `mirk`, framework `nextjs`)
- Checked live: all routes return 200; security headers and CSP present; `/api/*` validation and cross-site rejection work; 33 client chunks contain neither private key and no `sourceMappingURL`; `.map` URLs return 403.
- The full Playwright suite (24 tests, desktop and mobile) passes against the live URL.

## Network

| | |
| --- | --- |
| Chain | Robinhood Chain testnet, id `46630` |
| RPC | `https://rpc.testnet.chain.robinhood.com` |
| Explorer | `https://explorer.testnet.chain.robinhood.com` |
| Gloam SDK | `@gloamtrade/sdk` 0.2.2 |
| Gloam pool | `0x72406D9597807A46f730d8b4fDBC5aC45Dc1d740` (deploy block 126185021) |
| Gloam payment memo board | `0x689ebd9d30E0235c73fd8f10236F850CDB3c5DCE` |
| Gloam relayer (observed) | `0xb1E994586E62994648a0b866BF33F2EDd942512e` |

## MirkAccountRegistry

| | |
| --- | --- |
| Address | [`0x1882fE79FbBE790305665851635E6810c3E82569`](https://explorer.testnet.chain.robinhood.com/address/0x1882fE79FbBE790305665851635E6810c3E82569) |
| Deploy tx | [`0x292bab384be46f7fffd693df53e45ecf6e369f0cbbfedcea0f56b47bfea63a35`](https://explorer.testnet.chain.robinhood.com/tx/0x292bab384be46f7fffd693df53e45ecf6e369f0cbbfedcea0f56b47bfea63a35) (block 141789553) |
| Owner (deployer) | `0x5aDFCfa8f5101A11E749F3e87c01044337688126` |
| Registrar | `0x036a392B69A1455Fb06372839eB6a9836Eb2f069` |
| Compiler | solc 0.8.28, optimizer 10,000 runs, EVM `paris` |
| Verification | Sourcify **exact match** (creation and runtime), forwarded to Blockscout |

Both keys are throwaway testnet keys generated locally. The registrar key is stored as a sensitive Vercel environment variable; the deployer key is not uploaded anywhere.

## Real testnet transactions

Every transaction below was produced by the MIRK UI in a real browser (Playwright, with only the wallet prompt replaced by a local key), with proofs generated in the browser's Web Worker.

**Account registration via the live `/api/accounts/register`**
- [`0xae18c06927ac67bf2cc8f40e6c5607aaaf515c301d8946564dbdc223c41887e1`](https://explorer.testnet.chain.robinhood.com/tx/0xae18c06927ac67bf2cc8f40e6c5607aaaf515c301d8946564dbdc223c41887e1): registry then resolved to the submitted tag

**Full flow (local production build): add money → private send → recipient discovery and sweep → cash out**
- Add 0.0003 ETH (`shieldBound`, from sender's wallet): [`0x0750d8f1…cc85c`](https://explorer.testnet.chain.robinhood.com/tx/0x0750d8f17a54b1e5cb9f2b2d98fad867933f2566d2722e6dfe0796ca3dfcc85c)
- Private send 0.0001 ETH to a MIRK account number (via relay): [`0x9abbf365…b66e3`](https://explorer.testnet.chain.robinhood.com/tx/0x9abbf36587fbaa08b8906527dada287d297aa8640d33a7e16ef49a354e6b66e3)
- Recipient sweep into a fresh note (via relay): [`0x748f7b03…74d7e`](https://explorer.testnet.chain.robinhood.com/tx/0x748f7b0397c3143d017072ec420810a3bcdf1f3fdd62da3561225a89d2074d7e)
- Cash out 0.0001 ETH to recipient's public wallet (via relay): [`0x1e5f29b2…a8273`](https://explorer.testnet.chain.robinhood.com/tx/0x1e5f29b2f9bb4e9eb4f82ebd4d5554a2046314b01e2e002bb14952b633aa8273). Recipient's public balance increased by exactly 0.0001 ETH.

**Claim link on the live site: create → claim in a different browser by a new account**
- Add 0.0002 ETH: [`0xc64f497b…9b52c`](https://explorer.testnet.chain.robinhood.com/tx/0xc64f497b3157636e151119586ac7a67f66c62b91ea860c1644fdcd367d89b52c)
- Fund claim link with 0.0001 ETH (via relay through the live `/api/relay`): [`0x6814248e…41bc7`](https://explorer.testnet.chain.robinhood.com/tx/0x6814248ed15eb372f6f1f55658fddcffbe267b1029e2dce8797a47ad80a41bc7)
- A new account claimed it; a third browser then found no unclaimed payment.

All receipts above have status `success`. The private send, sweep and cash out were submitted by the Gloam relayer, so neither person's wallet address appears on them.

## Redeploying

```bash
vercel env ls production          # NEXT_PUBLIC_REOWN_PROJECT_ID, NEXT_PUBLIC_RH_RPC_URL,
                                  # NEXT_PUBLIC_ACCOUNT_REGISTRY_ADDRESS, REGISTRAR_PRIVATE_KEY (sensitive),
                                  # ENABLE_EXPERIMENTAL_COREPACK=1 (pnpm 12 via packageManager)
vercel deploy --prod
```

Keep the registrar funded with a little test ETH. Registration returns a clear "registrar needs gas" error when it is empty.
