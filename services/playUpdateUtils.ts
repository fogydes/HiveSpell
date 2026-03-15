import { calculateTurnDuration } from "./playRoomUtils";

interface WinnerSummary {
  id: string;
  name: string;
}

export const INTERMISSION_DURATION_MS = 10000;

export const buildIntermissionRoomUpdate = ({
  eliminatedPlayerId,
  now = Date.now(),
  resetStreak = false,
  winner,
}: {
  eliminatedPlayerId: string;
  now?: number;
  resetStreak?: boolean;
  winner?: WinnerSummary;
}) => {
  const updates: Record<string, string | number | null> = {
    status: "intermission",
    intermissionEndsAt: now + INTERMISSION_DURATION_MS,
    "gameState/currentWord": null,
    "gameState/currentTurnPlayerId": null,
    [`players/${eliminatedPlayerId}/status`]: "eliminated",
  };

  if (resetStreak) {
    updates["gameState/streak"] = 0;
  }

  if (winner) {
    updates["gameState/winnerId"] = winner.id;
    updates["gameState/winnerName"] = winner.name;
  }

  return updates;
};

export const buildNextTurnAfterEliminationUpdate = ({
  currentStreak,
  eliminatedPlayerId,
  newWord,
  nextPlayerId,
  now = Date.now(),
}: {
  currentStreak: number;
  eliminatedPlayerId: string;
  newWord: string;
  nextPlayerId: string;
  now?: number;
}) => ({
  [`players/${eliminatedPlayerId}/status`]: "eliminated",
  "gameState/currentWord": newWord,
  "gameState/startTime": now,
  "gameState/timerDuration": calculateTurnDuration(newWord, currentStreak),
  "gameState/currentTurnPlayerId": nextPlayerId,
  "gameState/currentInput": "",
});
