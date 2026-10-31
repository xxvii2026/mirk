import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { createPublicClient, createWalletClient, formatEther, http, parseEther, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { CHAIN, RPC_URL, txUrl } from "../../lib/robinhood/network";
import { connectAndUnlock, installWallet } from "./wallet";

/**
 * Real end-to-end smoke flow on Robinhood Chain testnet. Only the wallet UI is
 * replaced (by a local key); every proof, transaction and receipt is real.
 *   SMOKE=1 pnpm exec playwright test smoke --project=desktop
 */

test.skip(process.env.SMOKE !== "1", "Set SMOKE=1 to run against the live testnet.");
test.setTimeout(15 * 60_000);

function env(name: string): string {
  const line = readFileSync(".env.local", "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${name}=`));
  const v = line?.slice(name.length + 1).trim();
  if (!v) throw new Error(`${name} missing from .env.local`);
  return v;
}

const report: string[] = [];
function record(label: string, hash: string) {
  report.push(`- ${label}: [${hash}](${txUrl(hash as Hex)})`);
}

async function accountNumberOn(page: Page): Promise<string> {
  const loc = page.locator("text=/^\\d{4} \\d{4} \\d{4}$/").first();
  await expect(loc).toBeVisible({ timeout: 30_000 });
  return (await loc.textContent())!.replace(/\s/g, "");
}

test("connect → add money → private send → recipient sweep → cash out", async ({ browser }) => {
  const client = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) });
  const funder = createWalletClient({
    account: privateKeyToAccount(env("DEPLOYER_PRIVATE_KEY") as Hex),
    chain: CHAIN,
    transport: http(RPC_URL),
  });

  // Fresh throwaway keys for the two people in this story.
  const keyA = generatePrivateKey();
  const keyB = generatePrivateKey();
  const addrA = privateKeyToAccount(keyA).address;
  const addrB = privateKeyToAccount(keyB).address;
  const fund = await funder.sendTransaction({ to: addrA, value: parseEther("0.00012") });
  await client.waitForTransactionReceipt({ hash: fund });
  record("Fund sender's public wallet (0.00012 ETH)", fund);

  // --- Person A: connect, unlock, register, add money.
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  const walletA = await installWallet(pageA, { privateKey: keyA, broadcast: true });
  await pageA.goto("/app");
  await connectAndUnlock(pageA);
  await expect(pageA.getByText("Your private balance", { exact: true })).toBeVisible();
  await expect(pageA.getByText("Active").first()).toBeVisible({ timeout: 120_000 });

  await pageA.getByRole("link", { name: "Add money" }).click();
  await pageA.getByLabel(/Amount/).fill("0.00004");
  await pageA.getByRole("button", { name: "Add to private balance" }).click();
  await expect(pageA.getByRole("heading", { name: "Added to private balance" })).toBeVisible({ timeout: 240_000 });
  record("A adds 0.00004 ETH to private balance (shieldBound, browser proof)", walletA.sent.at(-1)!);
  await pageA.getByRole("link", { name: "Done" }).click();
  await expect(pageA.getByText("0.00004").first()).toBeVisible();

  // --- Person B: connect, unlock, get a registered account number.
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await installWallet(pageB, { privateKey: keyB, broadcast: true });
  await pageB.goto("/app");
  await connectAndUnlock(pageB);
  await expect(pageB.getByText("Active").first()).toBeVisible({ timeout: 120_000 });
  const numberB = await accountNumberOn(pageB);

  // --- A sends privately to B's account number, through the relay.
  await pageA.getByRole("link", { name: "Send" }).first().click();
  await pageA.getByLabel("Mirk account number").fill(numberB);
  await expect(pageA.getByText("Valid Mirk account")).toBeVisible({ timeout: 30_000 });
  await pageA.getByLabel(/Amount/).fill("0.00002");
  await pageA.getByRole("button", { name: "Send privately" }).click();
  await expect(pageA.getByRole("heading", { name: "Sent privately" })).toBeVisible({ timeout: 300_000 });
  const sendHashes = await pageA
    .locator("a[href*='/tx/']")
    .evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href.split("/tx/")[1]!));
  for (const h of sendHashes) record("A sends 0.00002 ETH privately to B (transfer via Mirk relay)", h);

  // --- B discovers the payment and sweeps it into a note only B knows.
  await pageB.getByRole("link", { name: "Receive" }).first().click();
  await expect(async () => {
    await pageB
      .getByRole("button", { name: /Check now|Checking/ })
      .click({ timeout: 5_000 })
      .catch(() => {});
    await expect(pageB.getByText("In your balance")).toBeVisible({ timeout: 60_000 });
  }).toPass({ timeout: 360_000 });
  await pageB.getByRole("link", { name: "Activity" }).first().click();
  const sweep = await pageB.locator("a[href*='/tx/']").first().getAttribute("href");
  if (sweep) record("B sweeps the received payment (transfer via relay)", sweep.split("/tx/")[1]!);

  // --- B cashes out to B's public wallet.
  await pageB.goto("/app");
  await pageB.getByRole("link", { name: "Cash out" }).click();
  await pageB.getByRole("button", { name: "My wallet" }).click();
  await pageB.getByLabel(/Amount/).fill("0.00002");
  await pageB.getByLabel("I understand the destination and amount become public.").check();
  const before = await client.getBalance({ address: addrB });
  await pageB.getByRole("button", { name: "Cash out" }).click();
  await expect(pageB.getByRole("heading", { name: "Cashed out" })).toBeVisible({ timeout: 300_000 });
  const outHashes = await pageB
    .locator("a[href*='/tx/']")
    .evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href.split("/tx/")[1]!));
  for (const h of outHashes) record("B cashes out 0.00002 ETH to B's public wallet (unshield via relay)", h);
  const after = await client.getBalance({ address: addrB });
  expect(after - before).toBe(parseEther("0.00002"));

  mkdirSync("deployments", { recursive: true });
  appendFileSync(
    "deployments/local-report.md",
    [
      `\n## Smoke run ${new Date().toISOString()}`,
      `Sender A public wallet: ${addrA}`,
      `Recipient B public wallet: ${addrB} (received ${formatEther(after - before)} ETH from cash out)`,
      ...report,
      "",
    ].join("\n"),
  );
  await ctxA.close();
  await ctxB.close();
});

test("claim link: create → open in a new browser → claim into a new account", async ({ browser }) => {
  const client = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) });
  const funder = createWalletClient({
    account: privateKeyToAccount(env("DEPLOYER_PRIVATE_KEY") as Hex),
    chain: CHAIN,
    transport: http(RPC_URL),
  });
  const keyC = generatePrivateKey();
  const fund = await funder.sendTransaction({ to: privateKeyToAccount(keyC).address, value: parseEther("0.0004") });
  await client.waitForTransactionReceipt({ hash: fund });
  report.length = 0;
  record("Fund link sender's public wallet (0.0004 ETH)", fund);

  const ctxC = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
  const pageC = await ctxC.newPage();
  const walletC = await installWallet(pageC, { privateKey: keyC, broadcast: true });
  await pageC.goto("/app");
  await connectAndUnlock(pageC);
  await pageC.getByRole("link", { name: "Add money" }).click();
  await pageC.getByLabel(/Amount/).fill("0.0002");
  await pageC.getByRole("button", { name: "Add to private balance" }).click();
  await expect(pageC.getByRole("heading", { name: "Added to private balance" })).toBeVisible({ timeout: 240_000 });
  record("C adds 0.0002 ETH (shieldBound)", walletC.sent.at(-1)!);
  await pageC.getByRole("link", { name: "Done" }).click();

  await pageC.getByRole("link", { name: "Send" }).first().click();
  await pageC.getByRole("tab", { name: "Claim link" }).click();
  await pageC.getByLabel(/Amount/).fill("0.0001");
  await pageC.getByRole("button", { name: "Create claim link" }).click();
  await expect(pageC.getByRole("heading", { name: "Claim link ready" })).toBeVisible({ timeout: 300_000 });
  const link = (await pageC.locator(".select-all").textContent())!.trim();
  expect(link).toMatch(/\/claim#m2\./);
  for (const h of await pageC
    .locator("a[href*='/tx/']")
    .evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href.split("/tx/")[1]!)))
    record("C funds a claim link with 0.0001 ETH (transfer via relay)", h);

  // A different person, in a different browser, with a brand-new wallet.
  const ctxD = await browser.newContext();
  const pageD = await ctxD.newPage();
  await installWallet(pageD, { broadcast: true });
  await pageD.goto(link.replace(/^https?:\/\/[^/]+/, ""));
  await expect.poll(() => new URL(pageD.url()).hash).toBe("");
  await expect(pageD.getByText("Waiting to be claimed")).toBeVisible({ timeout: 60_000 });
  await connectAndUnlock(pageD);
  await pageD.getByRole("button", { name: "Claim into my Mirk account" }).click();
  await expect(pageD.getByText("Confirmed on chain and now in your private balance.")).toBeVisible({
    timeout: 300_000,
  });

  // The same link cannot be claimed twice.
  const ctxE = await browser.newContext();
  const pageE = await ctxE.newPage();
  await pageE.goto(link.replace(/^https?:\/\/[^/]+/, ""));
  await expect(pageE.getByText("No unclaimed payment found")).toBeVisible({ timeout: 60_000 });

  appendFileSync(
    "deployments/local-report.md",
    [
      `\n## Claim-link smoke ${new Date().toISOString()}`,
      ...report,
      "- D claimed the link into a new Mirk account; a second browser then saw no unclaimed payment.",
      "",
    ].join("\n"),
  );
  await ctxC.close();
  await ctxD.close();
  await ctxE.close();
});
