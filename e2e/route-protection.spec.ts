import { test, expect } from "@playwright/test";

/**
 * Auth gating for the protected flows.
 *
 * Every gameplay/commerce surface (matchmaking, lobby, leaderboards, and the
 * shop, which is reached through the lobby) sits behind <ProtectedRoute>, which
 * redirects unauthenticated users to /auth (App.tsx). This is the security-
 * critical entry point for the matchmaking and shop flows, and it is fully
 * deterministic — the redirect happens before any data fetch.
 */
const PROTECTED_PATHS = [
  "/lobby",
  "/play/quick",
  "/leaderboards",
  "/battle-pass",
  "/challenges",
];

test.describe("Protected routes", () => {
  for (const path of PROTECTED_PATHS) {
    test(`redirects ${path} to /auth when logged out`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/auth$/);
      await expect(page.getByRole("button", { name: "LOGIN" })).toBeVisible();
    });
  }

  test("public routes are reachable without auth", async ({ page }) => {
    await page.goto("/auth");
    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  });
});
