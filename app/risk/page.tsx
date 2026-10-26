import type { Metadata } from "next";
import { InfoPage } from "@/components/brand/site-chrome";

export const metadata: Metadata = { title: "Risk" };

export default function Risk() {
  return (
    <InfoPage title="Risk">
      <p>
        <strong>Testnet only.</strong> mirk runs on Robinhood Chain testnet. Test assets have no value. Do not send real
        assets.
      </p>
      <p>
        <strong>No audit.</strong> mirk has not been externally audited. Gloam&apos;s testnet contracts use single-party
        development keys.
      </p>
      <p>
        <strong>Keys on your device.</strong> Anyone who controls your unlocked browser can spend your private balance.
        Malware or a compromised device can steal it.
      </p>
      <p>
        <strong>Losing access.</strong> If you clear your browser or lose your device without an encrypted backup, your
        private balance cannot be recovered by anyone.
      </p>
      <p>
        <strong>Claim links are bearer instruments.</strong> Whoever has the complete link can take the money.
      </p>
      <p>
        <strong>Third parties.</strong> mirk depends on Gloam&apos;s contracts and relay, Robinhood Chain, and Reown for
        wallet connections. Outages or changes there affect mirk.
      </p>
    </InfoPage>
  );
}
