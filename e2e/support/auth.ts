import type { Page } from "@playwright/test";

/**
 * E2E authentication fixture.
 *
 * `loginAs` seeds `window.__E2E_AUTH__` *before any page script runs* (via
 * page.addInitScript, which re-executes on every navigation in the context).
 * The AuthContext seam (context/AuthContext.tsx) — armed by VITE_E2E=true from
 * the Playwright webServer — reads this object and adopts the identity without
 * ever contacting Firebase or Supabase.
 *
 * Specs that do NOT call `loginAs` never set the fixture, so they exercise the
 * real logged-out flow and the route guards for real.
 */

export const E2E_UID = "e2e-test-user";

// Mirror of the app's UserData (context/AuthContext.tsx), kept as a plain object
// so it survives the structured clone across the addInitScript boundary. Values
// are deliberately cash-rich (nectar + premium) with an empty inventory so that
// every shop item renders an "Acquire" button.
export interface E2EUserData {
  nectar: number;
  lifetimeNectar: number;
  title: string;
  corrects: number;
  wins: number;
  inventory: string[];
  username: string;
  premium: number;
  tier: string;
  tierProgress: number;
  nextTierName: string;
  equippedTheme?: string;
  equippedCursor?: string | null;
  equippedBadge?: string | null;
  avatarUrl?: string;
}

const DEFAULT_USER_DATA: E2EUserData = {
  nectar: 1_000_000,
  lifetimeNectar: 1_000_000,
  title: "Worker Bee",
  corrects: 0,
  wins: 0,
  inventory: [],
  username: "E2ETester",
  premium: 100_000,
  tier: "Larva",
  tierProgress: 0,
  nextTierName: "Larva",
};

export async function loginAs(
  page: Page,
  overrides: Partial<E2EUserData> = {},
): Promise<void> {
  const userData: E2EUserData = { ...DEFAULT_USER_DATA, ...overrides };
  const user = {
    uid: E2E_UID,
    email: "e2e@hivespell.test",
    displayName: userData.username,
  };

  await page.addInitScript(
    (seed) => {
      (window as unknown as { __E2E_AUTH__?: unknown }).__E2E_AUTH__ = seed;
      try {
        // Pin the UI language so English string assertions hold regardless of
        // the CI browser's navigator.language (see i18n.ts lookupLocalStorage).
        window.localStorage.setItem("hivespell_language", "en");
      } catch {
        /* localStorage may be unavailable here; config also pins locale. */
      }
    },
    { user, userData },
  );
}
