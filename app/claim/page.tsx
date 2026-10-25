import type { Metadata } from "next";
import { ClaimView } from "./view";

export const metadata: Metadata = {
  title: "Claim a payment",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ClaimPage() {
  return <ClaimView />;
}
