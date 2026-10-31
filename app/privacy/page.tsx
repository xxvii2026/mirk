import type { Metadata } from "next";
import { InfoPage } from "@/components/brand/site-chrome";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <InfoPage title="Privacy">
      <p>
        <strong>What stays on your device:</strong> note secrets, receive keys, claim links you create, your private
        activity, and the signature that unlocks them. They are encrypted with AES-GCM in your browser&apos;s IndexedDB.
        Mirk never receives them.
      </p>
      <p>
        <strong>What Mirk&apos;s servers see:</strong> when your account number is registered, the number and your
        public receive key. When a private transfer or cash out is submitted, Mirk forwards the already-public proof
        data to Mirk&apos;s relay. Like any website, the hosting provider sees your IP address with these requests. Mirk
        keeps no logs of them.
      </p>
      <p>
        <strong>What is public on chain:</strong> deposits (amount, asset, depositing wallet), cash outs (amount, asset,
        destination), and that some private transfer happened. Amounts and parties of private transfers are not public.
      </p>
      <p>
        Mirk uses no analytics, no tracking cookies and no third-party trackers. Wallet connection is provided by Reown;
        their service sees the connection between your wallet and this site.
      </p>
      <p>
        Privacy depends on how many people use the pool and on timing. Adding and cashing out the same amount close
        together can be linked.
      </p>
    </InfoPage>
  );
}
