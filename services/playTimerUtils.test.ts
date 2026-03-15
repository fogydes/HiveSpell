import { describe, expect, it } from "vitest";
import {
  getRemainingIntermissionTime,
  getRemainingTurnTime,
  shouldTriggerTurnTimeout,
} from "./playTimerUtils";

describe("playTimerUtils", () => {
  it("calculates remaining turn time from start and duration", () => {
    expect(getRemainingTurnTime(10_000, 8, 14_000)).toBe(4);
  });

  it("clamps expired turn time to zero", () => {
    expect(getRemainingTurnTime(10_000, 5, 16_500)).toBe(0);
  });

  it("calculates intermission countdown in whole seconds", () => {
    expect(getRemainingIntermissionTime(21_500, 20_200)).toBe(2);
  });

  it("only times out the active player during live play", () => {
    expect(
      shouldTriggerTurnTimeout({
        isMyTurn: true,
        status: "playing",
        myStatus: "alive",
        remainingTime: 0,
      }),
    ).toBe(true);

    expect(
      shouldTriggerTurnTimeout({
        isMyTurn: false,
        status: "playing",
        myStatus: "alive",
        remainingTime: 0,
      }),
    ).toBe(false);

    expect(
      shouldTriggerTurnTimeout({
        isMyTurn: true,
        status: "speaking",
        myStatus: "alive",
        remainingTime: 0,
      }),
    ).toBe(false);

    expect(
      shouldTriggerTurnTimeout({
        isMyTurn: true,
        status: "playing",
        myStatus: "eliminated",
        remainingTime: 0,
      }),
    ).toBe(false);
  });
});
