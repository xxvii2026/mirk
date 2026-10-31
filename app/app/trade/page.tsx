import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Trade" };

export default function TradePage() {
  return (
    <ComingSoon
      title="Trade"
      sentence="Private swaps between assets are not available in Mirk yet; Mirk's payments-only pool does not support swaps."
    />
  );
}
