import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MIRK · Private money for the open economy", template: "%s · MIRK" },
  description: "Hold, send and receive privately on Robinhood Chain testnet, built on Gloam's shielded pool.",
  applicationName: "MIRK",
  referrer: "no-referrer",
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A0A0B",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
