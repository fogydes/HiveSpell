import { describe, expect, it } from "vitest";
import {
  buildPassTurnRoomUpdate,
  buildIntermissionRoomUpdate,
  buildNextTurnAfterEliminationUpdate,
  buildRoundRestartUpdate,
  buildWordAssignmentUpdate,
  INTERMISSION_DURATION_MS,
  TURN_AUDIO_LEAD_MS,
} from "./playUpdateUtils";
import type { Player } from "../types/multiplayer";

const makePlayer = (
  id: string,
  status: Player["status"],
  joinedAt = 0,
): Player => ({
  id,
  name: id,
  isHost: false,
  score: 0,
  corrects: 0,
  wins: 0,
  status,
  joinedAt,
});

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
      "gameState/startTime": 2000 + TURN_AUDIO_LEAD_MS,
      "gameState/timerDuration": 6.4,
      "gameState/currentTurnPlayerId": "p2",
      "gameState/currentInput": "",
    });
  });

  it("builds a round word assignment while preserving an existing turn", () => {
    expect(
      buildWordAssignmentUpdate({
        currentStreak: 10,
        existingTurnPlayerId: "p2",
        newWord: "honey",
        now: 3000,
        players: [
          makePlayer("p2", "alive", 20),
          makePlayer("p1", "connected", 10),
        ],
        recentWords: ["bee"],
      }),
    ).toEqual({
      currentWord: "honey",
      startTime: 3000 + TURN_AUDIO_LEAD_MS,
      timerDuration: 6.7,
      turnOrder: ["p1", "p2"],
      currentInput: "",
      recentWords: ["bee"],
    });
  });

  it("builds a round restart update that revives non-disconnected players", () => {
    expect(
      buildRoundRestartUpdate({
        players: [
          makePlayer("p1", "eliminated"),
          makePlayer("p2", "disconnected"),
        ],
      }),
    ).toEqual({
      status: "playing",
      intermissionEndsAt: null,
      "gameState/currentWord": null,
      "gameState/currentWordIndex": 0,
      "gameState/startTime": 0,
      "gameState/currentTurnPlayerId": null,
      "gameState/winnerId": null,
      "gameState/winnerName": null,
      "gameState/frozenTimeLeft": null,
      "gameState/currentInput": "",
      "gameState/streak": 0,
      "players/p1/status": "alive",
    });
  });

  it("builds solo and multiplayer pass-turn updates", () => {
    expect(
      buildPassTurnRoomUpdate({
        currentScore: 0,
        currentTurnPlayerId: "p1",
        currentUserId: "p1",
        now: 5000,
        players: [makePlayer("p1", "alive")],
        startTime: 3000,
        timerDuration: 10,
        turnOrder: ["p1"],
        wasEliminated: true,
      }),
    ).toEqual({
      "gameState/currentInput": "",
      status: "intermission",
      intermissionEndsAt: 5000 + INTERMISSION_DURATION_MS,
      "gameState/currentWord": null,
      "gameState/startTime": null,
      "gameState/timerDuration": null,
      "players/p1/status": "eliminated",
    });

    expect(
      buildPassTurnRoomUpdate({
        currentScore: 2,
        currentTurnPlayerId: "p1",
        currentUserId: "p1",
        now: 6000,
        players: [makePlayer("p1", "alive"), makePlayer("p2", "connected")],
        startTime: 4000,
        timerDuration: 10,
        turnOrder: ["p1", "p2"],
        wasEliminated: false,
      }),
    ).toEqual({
      "gameState/currentInput": "",
      "players/p1/score": 3,
      "gameState/currentTurnPlayerId": "p2",
      "gameState/currentWord": null,
      "gameState/startTime": null,
      "gameState/timerDuration": null,
    });
  });
});
