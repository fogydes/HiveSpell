import { describe, expect, it } from "vitest";
import { isItemOwned, isThemeUnlocked } from "./customizationCatalog";

describe("customizationCatalog", () => {
  it("treats built-in themes as unlocked", () => {
    expect(isThemeUnlocked("hive", [])).toBe(true);
    expect(isThemeUnlocked("royal", [])).toBe(true);
  });

  it("requires inventory ownership for premium themes", () => {
    expect(isThemeUnlocked("theme_honey", [])).toBe(false);
    expect(isThemeUnlocked("theme_honey", ["theme_honey"])).toBe(true);
    expect(isThemeUnlocked("theme_night", ["theme_night"])).toBe(true);
  });

  it("checks item ownership by inventory", () => {
    expect(isItemOwned(["badge_lexicon"], "badge_lexicon")).toBe(true);
    expect(isItemOwned([], "badge_lexicon")).toBe(false);
  });
});
