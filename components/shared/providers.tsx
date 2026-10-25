"use client";

import { createAppKit } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { VaultProvider } from "@/components/privacy/vault-provider";
import { REOWN_PROJECT_ID, networks, robinhoodTestnet, wagmiAdapter, wagmiConfig } from "@/lib/reown/config";

let appKitCreated = false;

function ensureAppKit() {
  if (appKitCreated || typeof window === "undefined" || !REOWN_PROJECT_ID) return;
  appKitCreated = true;
  createAppKit({
    adapters: [wagmiAdapter],
    networks,
    defaultNetwork: robinhoodTestnet,
    projectId: REOWN_PROJECT_ID,
    metadata: {
      name: "MIRK",
      description: "Private money for the open economy. Testnet.",
      url: window.location.origin,
      icons: [`${window.location.origin}/brand/mirk-icon.svg`],
    },
    allowUnsupportedChain: true,
    // Their SDK connectors send telemetry. Coinbase Wallet still connects as a
    // browser extension (EIP-6963) or over WalletConnect.
    enableCoinbase: false,
    enableBaseAccount: false,
    features: {
      analytics: false,
      email: false,
      socials: false,
      swaps: false,
      onramp: false,
      send: false,
      receive: false,
      history: false,
    },
    themeVariables: {
      "--w3m-accent": "#766FE8",
      "--w3m-border-radius-master": "2px",
      "--w3m-font-family": "var(--font-geist-sans), system-ui, sans-serif",
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  ensureAppKit();
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }),
  );
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <VaultProvider>{children}</VaultProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
