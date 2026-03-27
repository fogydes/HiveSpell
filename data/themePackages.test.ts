import { describe, expect, it } from "vitest";
import { THEME_OPTIONS } from "./customizationCatalog";
import {
  DEFAULT_THEME_ID,
  getThemePackage,
  THEME_PACKAGES,
} from "./themePackages";

describe("themePackages", () => {
  it("returns the default package when theme id is missing", () => {
    expect(getThemePackage(undefined).id).toBe(DEFAULT_THEME_ID);
  });

  it("covers every selectable theme option", () => {
    for (const option of THEME_OPTIONS) {
      expect(THEME_PACKAGES[option.id]).toBeDefined();
    }
  });

  it("defines scene, motion, and cursor tokens for every theme", () => {
    for (const themePackage of Object.values(THEME_PACKAGES)) {
      expect(themePackage.scene.appGradient.length).toBeGreaterThan(0);
      expect(themePackage.motion.durationBase.length).toBeGreaterThan(0);
      expect(themePackage.cursor.fallbackCursor.length).toBeGreaterThan(0);
    }
  });
});
