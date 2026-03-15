import { describe, expect, it } from "vitest";
import {
  buildIntermissionRoomUpdate,
  buildNextTurnAfterEliminationUpdate,
  INTERMISSION_DURATION_MS,
} from "./playUpdateUtils";

describe("playUpdateUtils", () => {
  it("builds an intermission update with optional winner and streak reset", () => {
    expect(
      buildIntermissionRoomUpdate({
        eliminatedPlayerId: "p1",
        now: 1000,
        resetStreak: true,
        winner: { id: "p2", name: "Bee Two" },
      }),
    ).toEqual({
      status: "intermission",
      intermissionEndsAt: 1000 + INTERMISSION_DURATION_MS,
      "gameState/currentWord": null,
      "gameState/currentTurnPlayerId": null,
      "players/p1/status": "eliminated",
      "gameState/streak": 0,
      "gameState/winnerId": "p2",
      "gameState/winnerName": "Bee Two",
    });
  });

  it("builds a next-turn elimination update with timer duration", () => {
    expect(
      buildNextTurnAfterEliminationUpdate({
        currentStreak: 20,
        eliminatedPlayerId: "p1",
        newWord: "honey",
        nextPlayerId: "p2",
        now: 2000,
      }),
    ).toEqual({
      "players/p1/status": "eliminated",
      "gameState/currentWord": "honey",
      "gameState/startTime": 2000,
      "gameState/timerDuration": 6.4,
      "gameState/currentTurnPlayerId": "p2",
      "gameState/currentInput": "",
    });
  });
});
