import type { Metadata } from "next";
import { InfoPage } from "@/components/brand/site-chrome";
import {
  CHAIN_ID,
  POOL_CONFIGURED,
  EXPLORER_URL,
  PAY_MEMO_ADDRESS,
  POOL_ADDRESS,
  REGISTRY_ADDRESS,
  addressUrl,
} from "@/lib/robinhood/network";

export const metadata: Metadata = { title: "Contracts" };

function Row({ name, address, note }: { name: string; address: string | null; note: string }) {
  return (
    <div className="border-line bg-surface rounded-2xl border p-4">
      <p className="text-ink font-medium">{name}</p>
      <p className="tabular text-sm break-all">
        {address ? (
          <a href={addressUrl(address as `0x${string}`)} target="_blank" rel="noopener noreferrer">
            {address}
          </a>
        ) : (
          "Not configured on this deployment"
        )}
      </p>
      <p className="mt-1 text-sm">{note}</p>
    </div>
  );
}

export default function Contracts() {
  return (
    <InfoPage title="Contracts">
      <p>
        Robinhood Chain testnet, chain {CHAIN_ID}. Explorer:{" "}
        <a href={EXPLORER_URL} target="_blank" rel="noopener noreferrer">
          {EXPLORER_URL.replace("https://", "")}
        </a>
      </p>
      <Row
        name="Mirk shielded pool"
        address={POOL_CONFIGURED ? POOL_ADDRESS : null}
        note="Holds all deposited test assets. Uses Mirk contracts and independently generated proving keys. The address must be configured after deployment."
      />
      <Row
        name="Mirk payment message board"
        address={POOL_CONFIGURED ? PAY_MEMO_ADDRESS : null}
        note="Carries encrypted payment notes so recipients can find payments. Holds no funds."
      />
      <Row
        name="MirkAccountRegistry"
        address={REGISTRY_ADDRESS}
        note="Maps account numbers to Mirk receive keys. Non-upgradeable, holds no funds, stores no names, wallets or balances."
      />
    </InfoPage>
  );
}
