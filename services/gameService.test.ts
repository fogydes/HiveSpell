import { describe, expect, it } from "vitest";
import { checkAnswer, getTitle, getWordDifficulty } from "./gameService";

describe("checkAnswer", () => {
  it("accepts exact answers case-insensitively", () => {
    expect(checkAnswer("Ball", "ball")).toBe(true);
  });

  it("accepts supported homophones", () => {
    expect(checkAnswer("pair", "pear")).toBe(true);
  });

  it("accepts supported US and UK spelling variants", () => {
    expect(checkAnswer("armor", "armour")).toBe(true);
    expect(checkAnswer("center", "centre")).toBe(true);
  });

  it("rejects unrelated answers", () => {
    expect(checkAnswer("pair", "banana")).toBe(false);
  });
});

describe("getTitle", () => {
  it("returns the default title for newer players", () => {
    expect(getTitle(10, 0)).toBe("Newbee");
  });

  it("promotes players at the expected milestones", () => {
    expect(getTitle(1500, 150)).toBe("Busy Bee");
    expect(getTitle(10000, 10)).toBe("Hive Master");
    expect(getTitle(50000, 500)).toBe("Queen Bee");
  });
});

describe("getWordDifficulty", () => {
  it("returns the original pool for a known hard word", () => {
    expect(getWordDifficulty("Pneumonoultramicroscopicsilicovolcanoconiosis")).toBe(
      "polymath",
    );
  });

  it("falls back to baby for unknown words", () => {
    expect(getWordDifficulty("totally-made-up-word")).toBe("baby");
  });
});
