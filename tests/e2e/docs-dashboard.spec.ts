import { expect, test } from "@playwright/test";
import { docs, docHref } from "../../components/docs/content";

test("disconnected Home keeps the dashboard and omits private values", async ({ page }, testInfo) => {
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Home", exact: true })).toBeVisible();
  await expect(page.getByText("Your private balance", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Balance unavailable")).toBeVisible();
  await expect(page.getByRole("button", { name: "Hide", exact: true })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Recent private activity" })).toBeVisible();
  await expect(page.getByText("Not connected", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Connect a wallet to open Mirk" })).toHaveCount(0);
  await expect(
    page.getByText("Mirk on Robinhood Chain testnet. Test assets have no value. Not externally audited."),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Connect wallet", exact: true }).locator("visible=true")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `/tmp/mirk-dashboard-${testInfo.project.name}.png`, fullPage: true });
});

test("docs navigation searches guide content and opens a real guide", async ({ page, isMobile }, testInfo) => {
  await page.goto("/docs");
  await expect(page.getByRole("heading", { name: "Private money, explained." })).toBeVisible();
  await page.screenshot({ path: `/tmp/mirk-docs-${testInfo.project.name}.png`, fullPage: true });
  if (isMobile) await page.getByText("Browse documentation", { exact: true }).click();
  const search = page.getByRole("searchbox", { name: "Search documentation" }).locator("visible=true");
  await search.fill("forgotten");
  const nav = page.getByRole("navigation", { name: "Documentation", exact: true }).locator("visible=true");
  await expect(nav.getByRole("link", { name: "Backups and recovery" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Quickstart", exact: true })).toHaveCount(0);
  await search.fill("zzznomatch");
  await expect(page.getByText("No guides found.", { exact: false }).locator("visible=true")).toBeVisible();
  await search.fill("backup");
  await nav.getByRole("link", { name: "Backups and recovery" }).click();
  await expect(page).toHaveURL(/\/docs\/backups$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Keep a way back to your money." })).toBeVisible();
  await page.getByRole("navigation", { name: "Documentation pages" }).getByRole("link", { name: /Next/ }).click();
  await expect(page).toHaveURL(/\/docs\/privacy$/, { timeout: 30_000 });
});

test("all documentation guides render without horizontal overflow", async ({ page }) => {
  for (const doc of docs) {
    await page.goto(docHref(doc.slug));
    await expect(page.getByRole("heading", { name: doc.heading, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), doc.slug).toBe(true);
  }
  await page.goto("/docs/not-a-guide");
  await expect(page.getByRole("heading", { name: /404/ })).toBeVisible();
});
