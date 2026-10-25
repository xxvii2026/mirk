import { expect, type Page } from "@playwright/test";
import { createPublicClient, createWalletClient, http, numberToHex, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { CHAIN, RPC_URL } from "../../lib/robinhood/network";

/**
 * Test-only wallet boundary. An EIP-1193 provider is injected into the page and
 * announced over EIP-6963; every request is answered in Node. Signing uses a
 * local key. Transactions are rejected unless `broadcast` is on, in which case
 * they are signed and sent to the real Robinhood Chain testnet.
 */
export interface TestWallet {
  address: Hex;
  setChain(id: number): Promise<void>;
  sent: Hex[];
}

export async function installWallet(
  page: Page,
  opts: { privateKey?: Hex; chainId?: number; broadcast?: boolean; rejectSign?: boolean } = {},
): Promise<TestWallet> {
  const account = privateKeyToAccount(opts.privateKey ?? generatePrivateKey());
  const publicClient = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain: CHAIN, transport: http(RPC_URL) });
  let chainId = opts.chainId ?? CHAIN.id;
  const sent: Hex[] = [];

  await page.exposeFunction("__mirkTestWallet", async (method: string, params: unknown[] = []) => {
    switch (method) {
      case "eth_requestAccounts":
      case "eth_accounts":
        return [account.address];
      case "eth_chainId":
        return numberToHex(chainId);
      case "net_version":
        return String(chainId);
      case "wallet_switchEthereumChain": {
        const [{ chainId: next }] = params as [{ chainId: Hex }];
        chainId = Number(next);
        return null;
      }
      case "wallet_addEthereumChain":
        return null;
      case "wallet_requestPermissions":
      case "wallet_getPermissions":
        return [{ parentCapability: "eth_accounts" }];
      case "personal_sign": {
        if (opts.rejectSign) throw Object.assign(new Error("User rejected the request."), { code: 4001 });
        const [data] = params as [Hex];
        return account.signMessage({ message: { raw: data } });
      }
      case "eth_sendTransaction": {
        if (!opts.broadcast) throw Object.assign(new Error("User rejected the request."), { code: 4001 });
        const [tx] = params as [{ to: Hex; data?: Hex; value?: Hex; gas?: Hex }];
        const hash = await walletClient.sendTransaction({
          to: tx.to,
          data: tx.data,
          value: tx.value ? BigInt(tx.value) : undefined,
          gas: tx.gas ? BigInt(tx.gas) : undefined,
        });
        sent.push(hash);
        return hash;
      }
      default:
        if (chainId !== CHAIN.id)
          throw Object.assign(new Error("Unsupported on this chain in test wallet"), { code: 4901 });
        return publicClient.request({ method: method as never, params: params as never });
    }
  });

  await page.addInitScript(() => {
    type Listener = (...a: unknown[]) => void;
    const listeners = new Map<string, Set<Listener>>();
    const call = (window as unknown as { __mirkTestWallet: (m: string, p?: unknown[]) => Promise<unknown> })
      .__mirkTestWallet;
    const provider = {
      isMetaMask: false,
      async request({ method, params }: { method: string; params?: unknown[] }) {
        try {
          const r = await call(method, params ?? []);
          if (method === "wallet_switchEthereumChain") {
            const id = await call("eth_chainId");
            listeners.get("chainChanged")?.forEach((l) => l(id));
          }
          return r;
        } catch (e) {
          const err = e as { message?: string; code?: number };
          const msg = err.message ?? "error";
          throw Object.assign(new Error(msg), { code: /rejected/i.test(msg) ? 4001 : (err.code ?? -32603) });
        }
      },
      on(ev: string, fn: Listener) {
        if (!listeners.has(ev)) listeners.set(ev, new Set());
        listeners.get(ev)!.add(fn);
      },
      removeListener(ev: string, fn: Listener) {
        listeners.get(ev)?.delete(fn);
      },
    };
    (window as unknown as { __mirkEmit: (ev: string, v: unknown) => void }).__mirkEmit = (ev, v) =>
      listeners.get(ev)?.forEach((l) => l(v));
    const info = {
      uuid: "6f1b0b0e-4d6e-4c3f-9e11-2a1d5b1f0e01",
      name: "E2E Wallet",
      icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Crect width='8' height='8' fill='%23766FE8'/%3E%3C/svg%3E",
      rdns: "dev.mirk.e2e",
    };
    const announce = () =>
      window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: Object.freeze({ info, provider }) }));
    window.addEventListener("eip6963:requestProvider", announce);
    announce();
  });

  return {
    address: account.address,
    sent,
    async setChain(id: number) {
      chainId = id;
      await page.evaluate(
        (hex) => (window as unknown as { __mirkEmit: (e: string, v: unknown) => void }).__mirkEmit("chainChanged", hex),
        numberToHex(id),
      );
    },
  };
}

/** Open AppKit and pick the injected test wallet. */
export async function connectAndUnlock(page: Page, { unlock = true } = {}) {
  const connect = page.getByRole("button", { name: "Connect wallet" });
  const connected = page.getByRole("heading", { name: /Unlock your private store|Switch to Robinhood Chain testnet/ });
  // An injected EIP-6963 wallet may already be connected on load.
  await expect(connect.or(connected).first()).toBeVisible({ timeout: 20_000 });
  if (await connect.isVisible()) {
    await connect.click();
    await page.getByText("E2E Wallet").first().click();
  }
  if (unlock) {
    await page.getByRole("button", { name: "Unlock" }).click();
  }
}
