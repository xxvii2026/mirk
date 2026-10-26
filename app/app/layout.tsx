import type { Metadata } from "next";
import { AppFrame } from "./frame";

export const metadata: Metadata = { title: { default: "Home", template: "%s · mirk" }, robots: { index: false } };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
