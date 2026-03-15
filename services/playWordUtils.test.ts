import { describe, expect, it } from "vitest";
import {
  appendRecentWord,
  pickRandomWord,
  pickWordAvoidingRecent,
} from "./playWordUtils";

describe("playWordUtils", () => {
  it("picks a deterministic random word when a random function is supplied", () => {
    expect(pickRandomWord(["alpha", "beta", "gamma"], () => 0.4)).toBe("beta");
  });

  it("avoids recently used words when alternatives exist", () => {
    expect(
      pickWordAvoidingRecent(["alpha", "beta", "gamma"], ["alpha"], () => 0),
    ).toBe("beta");
  });

  it("falls back to the full list when all words are recent", () => {
    expect(
      pickWordAvoidingRecent(["alpha", "beta"], ["alpha", "beta"], () => 0.9),
    ).toBe("beta");
  });

  it("stores recent words in lowercase and trims to the limit", () => {
    expect(appendRecentWord(["one", "two"], "Three", 2)).toEqual([
      "two",
      "three",
    ]);
  });
});
