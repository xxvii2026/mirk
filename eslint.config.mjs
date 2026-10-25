import next from "eslint-config-next/core-web-vitals";
import ts from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".claude/**",
      ".next/**",
      "node_modules/**",
      "contracts/**",
      "next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...next,
  ...ts,
  {
    rules: {
      "no-console": ["error", { allow: ["warn"] }],
    },
  },
];

export default config;
