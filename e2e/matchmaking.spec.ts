import { test, expect } from "@playwright/test";
import { loginAs } from "./support/auth";

/**
 * Critical flow #2 — Matchmaking (authenticated lobby).
 *
 * The logged-out redirect is covered in route-protection.spec.ts. Here we use
 * the AuthContext E2E seam (see support/auth.ts) to enter the app as a signed-in
 * player and confirm the matchmaking controls render and are interactive.
 *
 * The actual match-join writes to Firebase RTDB — a WebChannel stream that can't
 * be hermetically stubbed — so the join logic itself is covered by unit tests.
 * This spec stops at the deterministic pre-match surface.
 */
test.describe("Matchmaking lobby", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/lobby");
  });

  test("shows the difficulty selection and match controls", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: "Select Difficulty" }),
    ).toBeVisible();
    // One card per mode — assert at least the first Public / Private control.
    await expect(
      page.getByRole("button", { name: "Public Match" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create Private" }).first(),
    ).toBeVisible();
    await expect(page.getByPlaceholder("ENTER PRIVATE CODE")).toBeVisible();
  });

  test("uppercases a private room code as it is typed", async ({ page }) => {
    const code = page.getByPlaceholder("ENTER PRIVATE CODE");
    await code.fill("abcd12");
    // The input force-uppercases via its onChange handler (Lobby.tsx).
    await expect(code).toHaveValue("ABCD12");
  });
});
