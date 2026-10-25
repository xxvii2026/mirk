import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import { THEME_BOOTSTRAP } from "@/components/shared/theme";
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0C0D" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
