import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Marketplace" };

export default function MarketplacePage() {
  return (
    <ComingSoon
      title="Marketplace"
      sentence="Spending your private balance on gift cards, airtime and eSIMs, along with prepaid cards and mainnet, is planned for later."
    />
  );
}
