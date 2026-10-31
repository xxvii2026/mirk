export interface DocPage {
  slug: string;
  group: string;
  title: string;
  heading: string;
  description: string;
  sections: { id: string; title: string; text: string }[];
}

export const docs: DocPage[] = [
  {
    slug: "overview",
    group: "Start here",
    title: "Overview",
    heading: "Private money, explained.",
    description: "Understand your private balance, make your first payment, and learn what the chain can see.",
    sections: [
      {
        id: "what-is-mirk",
        title: "What is Mirk?",
        text: "Mirk is a browser app for holding and moving assets through a shielded pool on Robinhood Chain. Your wallet handles public deposits. Private notes, stored encrypted on your device, let you spend inside the pool. Your private balance is the value of your unspent notes.",
      },
      {
        id: "the-three-steps",
        title: "The three steps",
        text: "Add money from a public wallet into the pool. Send privately to a Mirk account number or create a claim link. Cash out to a public wallet when you want to leave the pool. Adding money and cashing out expose amounts on chain; private transfers use zero-knowledge proofs.",
      },
      {
        id: "what-you-can-do-today",
        title: "What you can do today",
        text: "Add ETH or USDG, send to a registered account number, receive payments, create and claim payment links, review local activity, and export or restore an encrypted backup. Trade and Marketplace are marked coming soon and are not available.",
      },
      {
        id: "your-wallet-and-your-private-store",
        title: "Your wallet and your private store",
        text: "Connecting identifies your public wallet. Signing to open unlocks your encrypted private store in this browser. These are separate steps: a connected wallet alone cannot display your private notes. You can explore Home before connecting; balances and account details stay empty.",
      },
      {
        id: "start-with-the-essentials",
        title: "Start with the essentials",
        text: "Follow Quickstart to open your store and make a small deposit. Read What stays private before sending, then Backups and recovery before holding a balance. Network and contracts lists the deployment used by this app.",
      },
    ],
  },
  {
    slug: "quickstart",
    group: "Start here",
    title: "Quickstart",
    heading: "Your first private payment.",
    description: "Go from an empty dashboard to a funded private balance.",
    sections: [
      {
        id: "connect-and-open",
        title: "Connect and open",
        text: "Open Mirk and choose Connect wallet. Use an EVM wallet on Robinhood Chain testnet. If prompted, switch networks, then choose Sign to open. This signature unlocks local data; it is not a deposit or a payment.",
      },
      {
        id: "add-a-small-amount",
        title: "Add a small amount",
        text: "Choose Add money, select ETH or USDG, and enter an amount from your public wallet. Keep ETH in the wallet for transaction gas. For a token deposit, approve spending if requested, then confirm the deposit transaction. Wait for confirmation before spending the private balance.",
      },
      {
        id: "save-a-backup",
        title: "Save a backup",
        text: "Go to Settings and export an encrypted backup with a passphrase. Keep the file and passphrase separately. A wallet connection is not a substitute for a backup of your private notes.",
      },
      {
        id: "make-a-payment",
        title: "Make a payment",
        text: "Choose Send, enter the recipient’s Mirk account number and an amount, and review the payment. Your browser builds the proof and submits the transaction. To pay someone without an account number, use the claim-link option and share the complete link privately.",
      },
      {
        id: "check-the-result",
        title: "Check the result",
        text: "Review Activity for confirmation or an error. The recipient opens Mirk to discover and process the incoming payment. A submitted transaction is not the same as a completed payment; keep the app open while it confirms.",
      },
    ],
  },
  {
    slug: "add-money",
    group: "Using Mirk",
    title: "Add money",
    heading: "Move money into your private balance.",
    description: "A deposit turns a public wallet balance into private notes on your device.",
    sections: [
      {
        id: "before-you-deposit",
        title: "Before you deposit",
        text: "Connect a wallet, switch to Robinhood Chain testnet, and open your private store. The app supports ETH and USDG. You need the selected asset in your public wallet and ETH for gas.",
      },
      {
        id: "deposit-flow",
        title: "Deposit flow",
        text: "Open Add money, choose an asset, and enter the amount. For USDG, your wallet may request an approval before the deposit. Mirk creates a note and a proof locally, then your wallet submits the deposit to the configured shielded pool.",
      },
      {
        id: "what-becomes-public",
        title: "What becomes public",
        text: "Your depositing wallet, asset, amount, timing, and pool interaction are public. Shielding does not erase the deposit transaction. Your subsequent private balance is represented by secret notes rather than a public per-wallet balance.",
      },
      {
        id: "confirmation-and-recovery",
        title: "Confirmation and recovery",
        text: "Wait for the transaction result before retrying. If an operation is interrupted, reopen the same store and use Settings → Rescan shielded pool to reconcile local records with the chain. Save a fresh backup after changes to your balance.",
      },
    ],
  },
  {
    slug: "send-receive",
    group: "Using Mirk",
    title: "Send and receive",
    heading: "Pay a Mirk account.",
    description: "Account numbers give people a way to pay you without sharing your public wallet.",
    sections: [
      {
        id: "find-your-account-number",
        title: "Find your account number",
        text: "Open your private store to create or load the account for this device. The account panel shows a 12-digit number and its registration status. Wait for it to become active before relying on it to receive payments.",
      },
      {
        id: "send-a-payment",
        title: "Send a payment",
        text: "Open Send, select the asset, enter the recipient’s account number, and choose an amount within your spendable private balance. Mirk checks the number’s check digit and looks up its receive key. Verify the number with the recipient before submitting.",
      },
      {
        id: "how-delivery-works",
        title: "How delivery works",
        text: "Your browser spends a note into a payment note and change, then seals payment information to the recipient’s receive key. An encrypted message is posted to the payment message board. The recipient’s browser discovers the payment and moves it into a fresh note before treating it as spendable.",
      },
      {
        id: "incoming-and-settling-balances",
        title: "Incoming and settling balances",
        text: "Keep Mirk open to check for incoming payments. An incoming amount can be settling while its sweep confirms; it is not yet spendable. If a payment is missing, verify the asset and number, inspect the sender’s transaction status, and rescan from Settings.",
      },
      {
        id: "account-number-privacy",
        title: "Account number privacy",
        text: "The registry maps a number to a receive key. It does not contain a name or private balance. Reusing and publicly sharing a number can still link your identity to that number. A new browser does not automatically recover the old browser’s notes or account.",
      },
    ],
  },
  {
    slug: "claim-links",
    group: "Using Mirk",
    title: "Claim links",
    heading: "Send money with a link.",
    description: "Pay someone who has not shared a Mirk account number.",
    sections: [
      {
        id: "create-and-share",
        title: "Create and share",
        text: "Use the claim-link option in Send and complete the payment. Copy the full generated URL and send it through a private channel. The link contains a one-time secret that authorizes claiming the payment.",
      },
      {
        id: "claim-a-payment",
        title: "Claim a payment",
        text: "Open the complete link in the browser where you want to receive the payment. Follow the wallet and private-store prompts, then claim the payment into your store. Keep the original message until claiming finishes: the app removes the secret from the address bar after reading it.",
      },
      {
        id: "treat-the-link-like-money",
        title: "Treat the link like money",
        text: "Anyone with the complete link can claim it. Do not post it publicly, send it to a link-preview service, or include it in a support request. The secret sits after the # fragment; browsers do not send that fragment in normal HTTP requests, but page scripts and anyone you share it with can read it.",
      },
      {
        id: "if-claiming-fails",
        title: "If claiming fails",
        text: "A missing or damaged fragment cannot authorize the payment. Ask the sender for the original full link. If no unclaimed payment is found, check the network, allow the sender’s transaction to confirm, and confirm whether the link has already been claimed. Retrying cannot spend a payment twice.",
      },
    ],
  },
  {
    slug: "cash-out",
    group: "Using Mirk",
    title: "Cash out",
    heading: "Return to a public wallet.",
    description: "Choose a destination and move assets out of the shielded pool.",
    sections: [
      {
        id: "choose-the-destination",
        title: "Choose the destination",
        text: "Open Cash out, select the asset and amount, and enter a valid address on Robinhood Chain. Check the entire address and confirm you control it or trust the recipient. An address on the wrong network is not a safe destination.",
      },
      {
        id: "review-what-is-revealed",
        title: "Review what is revealed",
        text: "The destination, asset, and amount are public. The form asks you to acknowledge this before continuing. A cash out does not publish your full remaining private balance, but timing and amounts can help observers correlate activity.",
      },
      {
        id: "submit-and-confirm",
        title: "Submit and confirm",
        text: "Mirk builds a proof that authorizes spending your note and withdrawing the chosen value. Wait for chain confirmation and follow the transaction link in Activity. Any remaining value is represented by change in your private store.",
      },
      {
        id: "when-a-transaction-is-interrupted",
        title: "When a transaction is interrupted",
        text: "Check Activity and the explorer before trying again. Use Rescan shielded pool in Settings to reconcile pending notes. A failed or delayed relay request is not evidence that a cash out has settled.",
      },
    ],
  },
  {
    slug: "backups",
    group: "Using Mirk",
    title: "Backups and recovery",
    heading: "Keep a way back to your money.",
    description: "Private notes live in your browser. Back them up before you need them.",
    sections: [
      {
        id: "what-a-backup-contains",
        title: "What a backup contains",
        text: "An encrypted backup contains your private-store records, including the note secrets needed to spend funds. The exported file is encrypted with your chosen passphrase. Store the file and passphrase separately and never share them.",
      },
      {
        id: "export-a-backup",
        title: "Export a backup",
        text: "Open Settings → Encrypted backup. Enter and repeat a passphrase, then choose Export encrypted backup. Save the downloaded JSON file somewhere independent of this browser. Export again after deposits, sends, received payments, and cash outs so the copy includes your latest records.",
      },
      {
        id: "restore-a-backup",
        title: "Restore a backup",
        text: "Connect the appropriate wallet and open a private store. In Settings, choose your backup JSON file, enter its passphrase, and select Restore backup. Then use Rescan shielded pool to reconcile restored records against on-chain state. The app checks the backup network before restoring.",
      },
      {
        id: "limits-of-recovery",
        title: "Limits of recovery",
        text: "A wallet seed phrase alone does not reconstruct every private note. Clearing browser data or losing the device without a usable backup can permanently lose access to funds. An old backup may be missing newer notes; a forgotten backup passphrase cannot be recovered by Mirk.",
      },
      {
        id: "locking-and-clearing",
        title: "Locking and clearing",
        text: "Lock private store closes access to decrypted data for this session. Clearing local Mirk data deletes encrypted keys from this device and requires an explicit confirmation. Export a usable backup before deleting anything.",
      },
    ],
  },
  {
    slug: "privacy",
    group: "How it works",
    title: "What stays private",
    heading: "Know the boundary of privacy.",
    description: "A shielded pool protects payment details, but it does not make every interaction invisible.",
    sections: [
      {
        id: "public-and-private-data",
        title: "Public and private data",
        text: "Deposits expose the depositing wallet, asset, and amount. Private notes conceal individual balances and transfer values behind commitments and proofs. Cash outs expose the destination, asset, and amount. Transaction timing and pool interactions remain observable.",
      },
      {
        id: "what-stays-on-your-device",
        title: "What stays on your device",
        text: "Note secrets and receive keys are stored encrypted in the browser. Opening the store uses a wallet signature locally. Proofs are generated on your device; the relay receives transaction data to submit rather than the secret note keys.",
      },
      {
        id: "what-the-relay-changes",
        title: "What the relay changes",
        text: "A relay can submit a private operation without your wallet submitting that transaction directly. That reduces one direct on-chain link. The relay and network providers may still observe connection metadata such as IP addresses and request timing.",
      },
      {
        id: "correlation-and-shared-identifiers",
        title: "Correlation and shared identifiers",
        text: "Matching deposit and withdrawal amounts, close timing, a small pool, reused public destinations, and publishing your account number can weaken privacy. Sharing a claim link also shares the authority to claim its payment.",
      },
      {
        id: "what-mirk-cannot-protect",
        title: "What Mirk cannot protect",
        text: "A compromised browser, malicious extension, infected device, or someone with access to an unlocked store can expose private data. Encryption at rest does not protect secrets while malicious code can read the open app. See Security and limitations for the broader threat model.",
      },
    ],
  },
  {
    slug: "shielded-pool",
    group: "How it works",
    title: "Notes and proofs",
    heading: "How the shielded pool works.",
    description: "Commitments record that value exists. Proofs authorize spending without publishing its secrets.",
    sections: [
      {
        id: "notes-and-commitments",
        title: "Notes and commitments",
        text: "A private note describes an asset, amount, and secrets. Its commitment is recorded in the pool’s Merkle tree. Your browser keeps the information needed to prove ownership and calculates your private balance from unspent notes.",
      },
      {
        id: "zero-knowledge-proofs",
        title: "Zero-knowledge proofs",
        text: "A proof demonstrates that an operation follows the circuit’s rules without disclosing the private inputs. The pool checks the proof and relevant public inputs before updating its state. Mirk generates proofs in a browser worker using the deployed circuit artifacts.",
      },
      {
        id: "preventing-double-spends",
        title: "Preventing double spends",
        text: "Spending reveals a nullifier derived from a note’s secret. The pool rejects nullifiers that were already spent. Observers can see that a spend happened without reading the underlying secret note.",
      },
      {
        id: "payment-delivery",
        title: "Payment delivery",
        text: "Encrypted payment messages let a recipient discover notes intended for their receive key. The message board carries ciphertext and does not hold deposited assets. The pool holds assets; the registry resolves account numbers; the browser stores private records.",
      },
      {
        id: "deployment-boundaries",
        title: "Deployment boundaries",
        text: "Notes and proofs belong to a particular pool and network. Mirk uses its own configured pool and proving artifacts. Assets in a previous pool do not migrate automatically; withdrawing them requires that pool’s supported withdrawal process.",
      },
    ],
  },
  {
    slug: "network",
    group: "Reference",
    title: "Network and contracts",
    heading: "Verify the network you use.",
    description: "Deployment details come from this app’s configured network.",
    sections: [
      {
        id: "supported-network",
        title: "Supported network",
        text: "Mirk currently targets Robinhood Chain testnet, chain ID 46630, with ETH as the gas asset. ETH and USDG are the configured deposit assets. This release does not provide a mainnet network selector or cross-chain deposits.",
      },
      {
        id: "contract-responsibilities",
        title: "Contract responsibilities",
        text: "The shielded pool holds assets and verifies proofs. The payment message board publishes encrypted payment information. MirkAccountRegistry maps account numbers to receive keys and holds no funds. Open the contract directory below for this deployment’s configured addresses.",
      },
      {
        id: "independent-deployment",
        title: "Independent deployment",
        text: "Mirk no longer uses Gloam pools, contracts, or hosted services. Do not send funds to an address copied from another project’s documentation. Confirm the network and deployed pool in the Mirk contract directory before interacting.",
      },
      {
        id: "test-assets",
        title: "Test assets",
        text: "This network uses test assets with no monetary value. Mirk has not been externally audited. Testnet behavior, availability, and configuration can change; use the app for testing rather than real-value custody.",
      },
    ],
  },
  {
    slug: "security",
    group: "Reference",
    title: "Security and limitations",
    heading: "Understand what you trust.",
    description: "The app, contracts, proving artifacts, device, and network all affect the safety of a payment.",
    sections: [
      {
        id: "software-and-proof-assumptions",
        title: "Software and proof assumptions",
        text: "Correctness depends on the pool contracts, circuits, verifier configuration, and cryptographic setup. A valid proof enforces the circuit as written; it does not demonstrate that all software is bug-free. Mirk has not received an external audit.",
      },
      {
        id: "device-and-storage",
        title: "Device and storage",
        text: "Use a browser that supports IndexedDB and secure browser cryptography. Private browsing or restrictive storage policies can prevent the store from opening. Clearing site data removes local records. Keep your browser and wallet secure, and maintain an encrypted backup.",
      },
      {
        id: "availability-and-settlement",
        title: "Availability and settlement",
        text: "RPC providers, the relay, and chain confirmation can fail or be delayed. Keep the app open during proof generation and confirmation. Check transaction hashes before retrying; rescan to reconcile local state after an interruption.",
      },
      {
        id: "current-scope",
        title: "Current scope",
        text: "Trade and Marketplace are unavailable. Mirk does not offer a hosted recovery service, guaranteed anonymity, or automatic migration from a legacy pool. Private balance data cannot be recovered by support without the required secrets.",
      },
      {
        id: "when-reporting-an-issue",
        title: "When reporting an issue",
        text: "Record the screen, error text, network, and public transaction hash when available. Never include a wallet seed phrase, private key, complete claim link, decrypted note, backup file, or backup passphrase in an issue report.",
      },
    ],
  },
  {
    slug: "troubleshooting",
    group: "Reference",
    title: "Troubleshooting",
    heading: "Get unstuck.",
    description: "Check the relevant state before repeating a payment.",
    sections: [
      {
        id: "my-balance-is-empty",
        title: "My balance is empty",
        text: "Before connecting, Home intentionally shows no amount. Connect the correct wallet, switch to the supported network, and sign to open the private store. Check the selected asset. On a new browser, restore your backup; connecting the same wallet does not automatically bring every note back.",
      },
      {
        id: "my-wallet-signature-was-rejected",
        title: "My wallet signature was rejected",
        text: "Choose Sign to open again when ready. A rejected signature leaves the store locked and does not move funds. If a signature cannot open an existing store, use your encrypted backup rather than deleting the only copy of your keys.",
      },
      {
        id: "my-payment-is-pending",
        title: "My payment is pending",
        text: "Open Activity and inspect the transaction hash on the explorer. Wait for confirmation. If the operation was interrupted, use Settings → Rescan shielded pool. Avoid creating another payment until you understand the first transaction’s result.",
      },
      {
        id: "i-cannot-receive-a-payment",
        title: "I cannot receive a payment",
        text: "Confirm your account number is active, the sender entered it correctly, and both sides are using the same network and pool. Keep Mirk open to process incoming messages. A settling balance is not yet available to spend.",
      },
      {
        id: "storage-or-proving-is-unavailable",
        title: "Storage or proving is unavailable",
        text: "Try a regular browser window with site storage enabled. Keep the tab open while generating a proof. If you change browsers or devices, restore an encrypted backup first. Do not clear storage as a first troubleshooting step.",
      },
      {
        id: "the-pool-or-wallet-connection-is-not-configured",
        title: "The pool or wallet connection is not configured",
        text: "This is a deployment configuration problem. The app needs its own pool, message board, deployment blocks, and wallet-connection project ID. Repeatedly reconnecting a wallet will not fix missing deployment settings.",
      },
    ],
  },
];

export function docHref(slug: string) {
  return slug === "overview" ? "/docs" : `/docs/${slug}`;
}
