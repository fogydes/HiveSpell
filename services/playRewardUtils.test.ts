import { describe, expect, it } from "vitest";
import { getCorrectAnswerNectarReward } from "./playRewardUtils";

describe("playRewardUtils", () => {
  it("returns the configured reward for a normal difficulty", () => {
    expect(getCorrectAnswerNectarReward("heated", "banana")).toEqual({
      difficulty: "heated",
      nectarToAdd: 14,
    });
  });

  it("derives the reward from the original word difficulty in omniscient mode", () => {
    expect(
      getCorrectAnswerNectarReward(
        "omniscient",
        "Pneumonoultramicroscopicsilicovolcanoconiosis",
      ),
    ).toEqual({
      difficulty: "polymath",
      nectarToAdd: 18,
    });
  });
});
