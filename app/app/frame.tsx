"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PrivateGate } from "@/components/privacy/gate";
import { SyncProvider } from "@/components/privacy/sync-provider";
import { AppShell } from "@/components/shared/app-shell";
import { Providers } from "@/components/shared/providers";

// Informational pages with no private data do not need a wallet or an unlocked store.
const PUBLIC_PATHS = new Set(["/app/trade", "/app/marketplace"]);

export function AppFrame({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <Providers>
      <AppShell>
        {PUBLIC_PATHS.has(path) ? (
          children
        ) : (
          <PrivateGate>
            <SyncProvider>{children}</SyncProvider>
          </PrivateGate>
        )}
      </AppShell>
    </Providers>
  );
}
