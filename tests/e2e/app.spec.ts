import { expect, test } from "@playwright/test";
import { connectAndUnlock, installWallet } from "./wallet";

test.describe("connect, network and unlock", () => {
  test("shows the connect-wallet screen", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Connect a wallet to open mirk" })).toBeVisible();
    await expect(page.getByText("Test assets have no value").first()).toBeVisible();
  });

  test("asks to switch from the wrong network and recovers", async ({ page }) => {
    await installWallet(page, { chainId: 1 });
    await page.goto("/app");
    await connectAndUnlock(page, { unlock: false });
    await expect(page.getByRole("heading", { name: "Switch to Robinhood Chain testnet" })).toBeVisible();
    await page.getByRole("button", { name: "Switch network" }).click();
    await expect(page.getByRole("heading", { name: "Unlock your private store" })).toBeVisible();
  });

  test("keeps the store locked when the signature is rejected", async ({ page }) => {
    await installWallet(page, { rejectSign: true });
    await page.goto("/app");
    await connectAndUnlock(page);
    await expect(page.getByText("You cancelled the signature")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Unlock your private store" })).toBeVisible();
  });

  test("unlocks, creates an account number and hides balances", async ({ page }) => {
    await installWallet(page);
    await page.goto("/app");
    await connectAndUnlock(page);
    await expect(page.getByText("Your private balance")).toBeVisible();
    await expect(page.getByText("Only you can see this amount.")).toBeVisible();

    // A 12-digit grouped account number is created on this device.
    await expect(page.locator("text=/^\\d{4} \\d{4} \\d{4}$/").first()).toBeVisible();

    await page.getByRole("button", { name: "Hide" }).click();
    await expect(page.getByLabel("Hidden").first()).toBeVisible();
    await page.getByRole("button", { name: "Show" }).click();
    await expect(page.getByLabel("Hidden")).toHaveCount(0);
  });
});

test.describe("money forms", () => {
  test.beforeEach(async ({ page }) => {
    await installWallet(page);
    await page.goto("/app");
    await connectAndUnlock(page);
    await expect(page.getByText("Your private balance")).toBeVisible();
  });

  test("send validates account numbers before any lookup", async ({ page }) => {
    // In-app navigation: a full reload would (correctly) lock the store again.
    await page.getByRole("link", { name: "Send" }).first().click();
    const input = page.getByLabel("mirk account number");
    await input.fill("4829 1630 7715");
    await expect(page.getByText("does not pass the check digit")).toBeVisible();
    await input.fill("12ab");
    await expect(page.getByText("digits only")).toBeVisible();
    await page.getByLabel(/Amount/).fill("1");
    await page.getByLabel(/Amount/).blur();
    await expect(page.getByText("more than your private balance")).toBeVisible();
  });

  test("cash out shows the public-data warning and requires acknowledgement", async ({ page }) => {
    await page.getByRole("link", { name: "Cash out" }).click();
    await expect(page.getByText("This becomes public")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cash out" })).toBeDisabled();
    await page.getByLabel("Destination address").fill("0x5aDFCfa8f5101A11E749F3e87c01044337688127");
    await page.getByLabel("Destination address").blur();
    await expect(page.getByText("fails its checksum")).toBeVisible();
    await page.getByLabel("I understand the destination and amount become public.").check();
    await expect(page.getByRole("button", { name: "Cash out" })).toBeEnabled();
  });
});

test.describe("claim links", () => {
  test("rejects malformed and tampered links and strips the fragment", async ({ page }) => {
    await page.goto("/claim#m1.abc.def");
    await expect(page.getByText("This link cannot be used")).toBeVisible();
    await expect(page.getByText("failed its integrity check")).toBeVisible();
    expect(new URL(page.url()).hash).toBe("");

    await page.goto("about:blank");
    await page.goto("/claim#nonsense");
    await expect(page.getByText("incomplete or damaged")).toBeVisible();

    await page.goto("about:blank");
    await page.goto("/claim");
    await expect(page.getByText("missing its code")).toBeVisible();
  });

  test("accepts a well-formed link, removes it from the address bar and looks it up on chain", async ({ page }) => {
    await page.goto("/");
    const link = await page.evaluate(async () => {
      const kp = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
      const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
      const body = btoa(JSON.stringify({ n: 46630, k: { x: jwk.x, y: jwk.y, d: jwk.d }, b: "141000000" }))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`m1|${body}`)));
      let s = "";
      for (const b of d.slice(0, 9)) s += String.fromCharCode(b);
      return `m1.${body}.${btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
    });
    await page.goto(`/claim#${link}`);
    await expect(page.getByText("Anyone holding the complete link can claim it")).toBeVisible();
    expect(new URL(page.url()).hash).toBe("");
    await expect(page.getByText("No unclaimed payment found")).toBeVisible({ timeout: 30_000 });
  });
});

test.describe("coming soon, navigation, theme", () => {
  for (const path of ["/app/trade", "/app/marketplace"]) {
    test(`${path} is honest and has no actionable fake controls`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("main").getByText("Coming soon")).toBeVisible();
      const main = page.locator("main");
      await expect(main.locator("input, select, textarea, form")).toHaveCount(0);
      await expect(main.getByRole("button")).toHaveCount(0);
    });
  }

  test("navigation works at this viewport without horizontal overflow", async ({ page, isMobile }) => {
    await page.goto("/app/trade");
    const nav = page.getByRole("navigation", { name: "Main" }).locator("visible=true");
    await nav.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/app\/settings$/);
    for (const p of ["/", "/app", "/claim", "/docs"]) {
      await page.goto(p);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(overflow, `${p} overflows${isMobile ? " on mobile" : ""}`).toBe(false);
    }
  });

  test("is dark whatever the system theme", async ({ browser }) => {
    for (const scheme of ["light", "dark"] as const) {
      const ctx = await browser.newContext({ colorScheme: scheme });
      const page = await ctx.newPage();
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(bg).toBe("rgb(10, 10, 11)");
      await ctx.close();
    }
  });
});
