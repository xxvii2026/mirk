import { expect, test } from "@playwright/test";

test("keeps payments closed until Mirk's pool is configured", async ({ page }, testInfo) => {
  test.skip(Boolean(process.env.NEXT_PUBLIC_MIRK_POOL_ADDRESS), "Only applies before deployment.");
  await page.goto("/app/add");
  await expect(page.getByRole("heading", { name: "Mirk is getting its own pool." })).toBeVisible();
  await expect(page.getByRole("main").getByRole("button", { name: "Connect wallet", exact: true })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("Gloam");
  const width = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth }));
  expect(width.page).toBeLessThanOrEqual(width.viewport);
  await page.screenshot({ path: `/tmp/mirk-pending-${testInfo.project.name}.png`, fullPage: true });
});

test("removes the noisy tour and uses Mirk branding", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Private money for the open economy." })).toBeVisible();
  await expect(page.getByText("Everything you need. Nothing the chain needs.")).toHaveCount(0);
  await expect(page.locator('a[href*="gloam.trade"]')).toHaveCount(0);
  await page.locator('a[href="#how"]').click();
  await expect(page).toHaveURL(/#how$/);
});
