import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "./support/auth";

/**
 * Critical flow #3 — Shop (authenticated).
 *
 * Uses the AuthContext E2E seam (support/auth.ts) to enter as a logged-in,
 * cash-rich player, then drives the real Shop UI opened from the header. The
 * only backend dependency on the happy path — the `purchase_item` Supabase RPC
 * — is stubbed at the network layer, so the purchase flow is deterministic and
 * hermetic (no real database mutation).
 */

async function openShop(page: Page): Promise<void> {
  await page.goto("/lobby");
  // Desktop persistent sidebar button; title resolves to "Shop" once i18n
  // hydrates (header.shop). `:visible` disambiguates it from the mobile menu
  // clone that is display:none at the desktop viewport.
  await page.locator('button[title="Shop"]:visible').click();
  await expect(
    page.getByRole("heading", { name: "The Aetheric Bazaar" }),
  ).toBeVisible();
}

test.describe("Shop", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("opens from the header and shows the storefront", async ({ page }) => {
    await openShop(page);
    // Primary browse controls (the category lanes) are the stable storefront
    // chrome; assert both the default and a specific lane are present.
    await expect(
      page.getByRole("button", { name: /Full catalogue/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Theme chambers/ }),
    ).toBeVisible();
    // ...and the catalogue itself renders purchasable items.
    await expect(
      page.getByRole("button", { name: /^Acquire ·/ }).first(),
    ).toBeVisible();
  });

  test("completes a purchase when the RPC succeeds", async ({ page }) => {
    // Stub the purchase RPC and its CORS preflight before opening the shop.
    await page.route("**/rest/v1/rpc/purchase_item", async (route) => {
      const cors = {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "*",
      };
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: cors });
        return;
      }
      await route.fulfill({
        status: 200,
        headers: { ...cors, "content-type": "application/json" },
        body: JSON.stringify({ success: true }),
      });
    });

    await openShop(page);

    // Scope to the theme category so the first "Acquire" is a nectar item
    // purchased via purchase_item (bundles use a different RPC + toast).
    await page.getByRole("button", { name: /Theme chambers/ }).click();

    const acquire = page
      .getByRole("button", { name: /^Acquire ·/ })
      .first();
    await expect(acquire).toBeVisible();
    await acquire.click();

    await expect(page.getByText("Purchase complete")).toBeVisible();
  });
});
