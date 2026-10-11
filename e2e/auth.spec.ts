import { test, expect } from "@playwright/test";
import { loadEnv } from "vite";

/**
 * Critical flow #1 — Authentication (Auth page UI).
 *
 * These assertions are fully deterministic and require no backend: they cover
 * the login/sign-up toggle, the fields each mode shows, and the social sign-in
 * buttons (Google always shown; Discord gated behind VITE_ENABLE_DISCORD_LOGIN).
 * Success-path sign-in is a backend round-trip and is covered by the
 * guard/redirect behaviour in route-protection.spec.ts plus unit tests.
 */

/**
 * Mirror of `discordLoginEnabled()` in services/discordOAuth.ts, resolved with
 * Vite's own loader so it matches whatever the dev server under test read.
 * `playwright.config.ts` pins only VITE_E2E, and `reuseExistingServer` may hand
 * us a server started from the developer's .env.local, so the flag cannot be
 * assumed off — derive it instead of hardcoding an expectation.
 */
const viteEnv = loadEnv("development", process.cwd(), "VITE_");
const discordLoginEnabled =
  viteEnv.VITE_ENABLE_DISCORD_LOGIN === "true" &&
  !!viteEnv.VITE_DISCORD_CLIENT_ID;

test.describe("Auth page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
  });

  test("renders the login form by default", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
    await expect(page.getByText("Email or Username")).toBeVisible();
    await expect(page.getByText("Password", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "LOGIN" })).toBeVisible();
  });

  test("shows the Google social button and gates Discord behind its flag", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: /Continue with Google/i }),
    ).toBeVisible();

    const discord = page.getByRole("button", {
      name: /Continue with Discord/i,
    });
    if (discordLoginEnabled) {
      await expect(discord).toBeVisible();
    } else {
      await expect(discord).toHaveCount(0);
    }
  });

  test("toggles between login and sign-up modes", async ({ page }) => {
    // Login mode: no username field.
    await expect(page.getByPlaceholder("Pick a username")).toHaveCount(0);

    await page.getByRole("button", { name: "Sign Up" }).click();

    // Sign-up mode: username field appears, submit switches to SIGN UP.
    await expect(page.getByRole("heading", { name: "Sign up" })).toBeVisible();
    await expect(page.getByPlaceholder("Pick a username")).toBeVisible();
    await expect(page.getByRole("button", { name: "SIGN UP" })).toBeVisible();

    // Toggle back to login.
    await page.getByRole("button", { name: "Log In" }).click();
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
    await expect(page.getByPlaceholder("Pick a username")).toHaveCount(0);
  });

  test("requires email/username and password before submitting", async ({
    page,
  }) => {
    // Native HTML5 validation blocks submission with empty required fields, so
    // we stay on /auth and no error banner is produced.
    await page.getByRole("button", { name: "LOGIN" }).click();
    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  });
});
