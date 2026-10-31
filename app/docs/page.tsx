import type { Metadata } from "next";
import { DocsArticle } from "@/components/docs/article";
import { docs } from "@/components/docs/content";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Learn to use Mirk: private balances, payments, claim links, backups, and the shielded pool.",
};

export default function Docs() {
  return <DocsArticle doc={docs[0]!} />;
}
