import type { AppKitNetwork } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { http } from "wagmi";
import { CHAIN, CHAIN_ID, RPC_URL } from "../robinhood/network";

export const REOWN_PROJECT_ID = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID?.trim() ?? "";

export const robinhoodTestnet: AppKitNetwork = {
  ...CHAIN,
  id: CHAIN_ID,
};

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [robinhoodTestnet];

/** One wagmi config for the whole app, owned by the Reown adapter. */
export const wagmiAdapter = new WagmiAdapter({
  projectId: REOWN_PROJECT_ID || "missing-project-id",
  networks,
  ssr: false,
  transports: { [CHAIN_ID]: http(RPC_URL) },
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
