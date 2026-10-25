import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

function origin(url: string | undefined): string | null {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
}

const rpcOrigins = Array.from(
  new Set(["https://rpc.testnet.chain.robinhood.com", origin(process.env.NEXT_PUBLIC_RH_RPC_URL)].filter(Boolean)),
);

// Reown AppKit / WalletConnect hosts, the Robinhood RPC, and Gloam's circuit files.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://*.walletconnect.com https://*.walletconnect.org https://*.reown.com https://api.web3modal.org https://explorer-api.walletconnect.com",
  "font-src 'self' data: https://fonts.gstatic.com https://fonts.reown.com",
  [
    "connect-src 'self'",
    ...rpcOrigins,
    "https://www.gloam.trade",
    "https://*.walletconnect.com",
    "https://*.walletconnect.org",
    "wss://*.walletconnect.com",
    "wss://*.walletconnect.org",
    "https://*.reown.com",
    "wss://*.reown.com",
    "https://api.web3modal.org",
    "https://api.web3modal.com",
    "https://pulse.walletconnect.org",
    ...(isDev ? ["ws://localhost:*"] : []),
  ].join(" "),
  "frame-src 'self' https://verify.walletconnect.com https://verify.walletconnect.org https://secure.walletconnect.org https://secure.walletconnect.com https://*.reown.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  logging: { fetches: { fullUrl: false } },
  turbopack: {
    resolveAlias: Object.fromEntries(
      [
        "@x402/core/client",
        "@x402/evm",
        "@x402/evm/exact/client",
        "@x402/evm/upto/client",
        "@x402/svm/exact/client",
      ].map((m) => [m, "./lib/stubs/unused-optional.mjs"]),
    ),
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
