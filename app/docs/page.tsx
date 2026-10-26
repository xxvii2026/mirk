import type { Metadata } from "next";
import { InfoPage } from "@/components/brand/site-chrome";

export const metadata: Metadata = { title: "How mirk works" };

export default function Docs() {
  return (
    <InfoPage title="How mirk works">
      <p>
        mirk is an interface to the <strong>Gloam shielded pool</strong> on Robinhood Chain testnet. It does not hold
        your money. It helps your browser create, store and spend private notes in that pool.
      </p>
      <h2>Your private balance</h2>
      <p>
        When you add money, your browser creates a private note and a zero-knowledge proof, and your wallet deposits the
        asset into the pool. The note&apos;s secret is the only thing that can spend it. mirk encrypts it on this device
        with a key unlocked by a wallet signature that never leaves the device. Your private balance is the sum of your
        unspent notes.
      </p>
      <h2>Account numbers</h2>
      <p>
        Each device gets a random 12-digit account number with a check digit. A small registry contract maps the number
        to a Gloam receive key, and to nothing else: no name, wallet address or balance.
      </p>
      <h2>Sending and receiving</h2>
      <p>
        A private transfer spends one of your notes into a payment note and a change note, proved on your device and
        submitted through the Gloam relay so your wallet does not appear. The payment note is sealed to the
        recipient&apos;s receive key and posted to an encrypted message board. The recipient&apos;s mirk finds it and
        moves it into a fresh note only they know before counting it.
      </p>
      <h2>Claim links</h2>
      <p>
        A claim link is a payment to a one-time key whose private half is in the link, after the <code>#</code>, which
        browsers never send to servers. Anyone with the complete link can claim it.
      </p>
      <h2>Cash out</h2>
      <p>
        Cashing out proves you own a note and sends its value to a public address you choose. The destination and amount
        are public.
      </p>
      <h2>Backups</h2>
      <p>
        Export an encrypted backup from Settings. Without it, clearing your browser or losing your device can lose your
        private balance permanently.
      </p>
    </InfoPage>
  );
}
