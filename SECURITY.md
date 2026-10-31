# Security

## Status

- **Testnet only.** Mirk runs on Robinhood Chain testnet (chain 46630). Test assets have no value. Do not use real assets.
- **No external audit.** Neither Mirk's code nor its `MirkAccountRegistry` contract has been externally audited. Mirk's independent testnet setup uses single-party development proving keys.

## Reporting a vulnerability

Email **security@[your-domain]** (placeholder: replace before any public launch). Please include steps to reproduce. Do not open public issues for vulnerabilities.

## Threat model

### Note secrets

A note secret is the sole authority to spend a private note. Mirk:

- generates secrets in the browser through the locally maintained Mirk SDK, and encrypts them (AES-GCM, random 256-bit vault key) in IndexedDB **before** any transaction that depends on them is broadcast;
- wraps the vault key with a key derived (SHA-256 then HKDF-SHA256, domain-separated by chain, version and wallet) from a fixed wallet signature that never leaves the device;
- never sends secrets, receive private keys, signatures or decrypted activity to any server, analytics service, log, cookie, query string or crash reporter;
- never renders secrets into the DOM.

Received payments are not counted until they are swept into a fresh note only the recipient knows, because the payer also knows the received note's secret.

### Browser and device compromise

Anyone who controls the unlocked browser (malware, a malicious extension, physical access) can read decrypted notes from memory and spend them. Locking the store clears the key from memory; a full reload also locks it. Clearing site data without an encrypted backup permanently loses access to the private balance.

### Claim-link bearer risk

A claim link contains the private half of a one-time receive key, after the `#`. Browsers do not send fragments to servers, and Mirk removes it from the address bar on open. **Anyone holding the complete link can claim the money.** Links can leak through chat backups, screenshots or synced browser history. The sender can claim an open link back by opening it.

### Server components

- `/api/accounts/register` uses a throwaway registrar key from server-only environment variables. It validates input strictly, checks for duplicates on chain, applies per-IP and global rate limits, rejects cross-site browser requests and logs nothing.
- `/api/relay` forwards only the three public relay actions (transfer, unshield, memo) with strict schemas. Their contents are published on chain anyway.
- A strict Content Security Policy limits scripts, connections and frames to Mirk, the Robinhood RPC, Mirk's own circuit files and Reown.
- Circuit files are checked against the Mirk manifest's pinned SHA-256 hashes before proving.

### Privacy limits

Privacy depends on the **anonymity-set size** (how many notes are in the pool) and on **transaction timing**. Deposits and cash outs are public. Adding and cashing out the same amount close together can be linked. The relay operator and Mirk's hosting can observe IP addresses of requests they handle. Registration links an IP address to an account number's public receive tag at the moment of registration.

## Independent-pool migration

The independent pool is deployed on testnet but has not been externally audited. See POOL_MIGRATION.md for testnet setup limits, single-signer relay restrictions and the mandatory legacy-fund recovery procedure. Existing Gloam-pool funds do not move automatically.
