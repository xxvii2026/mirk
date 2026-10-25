import type { Metadata } from "next";
import { AppFrame } from "./frame";

export const metadata: Metadata = { title: { default: "Home", template: "%s · MIRK" }, robots: { index: false } };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
