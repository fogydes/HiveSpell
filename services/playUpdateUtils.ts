import type { Player } from "../types/multiplayer";
import {
  calculateTurnDuration,
  findNextActiveTurnPlayer,
  getPostTurnState,
  getRoundTurnOrder,
} from "./playRoomUtils";

interface WinnerSummary {
  id: string;
  name: string;
}

export const INTERMISSION_DURATION_MS = 10000;
export const TURN_AUDIO_LEAD_MS = 1200;

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
  "gameState/startTime": now + TURN_AUDIO_LEAD_MS,
  "gameState/timerDuration": calculateTurnDuration(newWord, currentStreak),
  "gameState/currentTurnPlayerId": nextPlayerId,
  "gameState/currentInput": "",
});

export const buildWordAssignmentUpdate = ({
  currentStreak,
  existingTurnPlayerId,
  newWord,
  now = Date.now(),
  players,
  recentWords,
}: {
  currentStreak: number;
  existingTurnPlayerId?: string | null;
  newWord: string;
  now?: number;
  players: Player[];
  recentWords: string[];
}) => {
  const turnOrder = getRoundTurnOrder(players);
  const updateData: Record<string, string | number | string[] | null> = {
    currentWord: newWord,
    startTime: now + TURN_AUDIO_LEAD_MS,
    timerDuration: calculateTurnDuration(newWord, currentStreak),
    turnOrder,
    currentInput: "",
    recentWords,
  };

  if (!existingTurnPlayerId) {
    updateData.currentTurnPlayerId = turnOrder[0] || null;
  }

  return updateData;
};

export const buildRoundRestartUpdate = ({
  players,
}: {
  players: Player[];
}) => {
  const updates: Record<string, string | number | null> = {
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
  };

  players
    .filter((player) => player.status !== "disconnected")
    .forEach((player) => {
      updates[`players/${player.id}/status`] = "alive";
    });

  return updates;
};

export const buildPassTurnRoomUpdate = ({
  currentScore,
  currentTurnPlayerId,
  currentUserId,
  now = Date.now(),
  players,
  startTime,
  timerDuration,
  turnOrder,
  wasEliminated,
}: {
  currentScore: number;
  currentTurnPlayerId?: string | null;
  currentUserId?: string | null;
  now?: number;
  players: Player[];
  startTime: number;
  timerDuration: number;
  turnOrder: string[];
  wasEliminated: boolean;
}) => {
  const updates: Record<string, string | number | null> = {
    "gameState/currentInput": "",
  };

  const isSoloMode = players.length === 1;
  if (isSoloMode && wasEliminated && currentUserId) {
    updates.status = "intermission";
    updates.intermissionEndsAt = now + INTERMISSION_DURATION_MS;
    updates["gameState/currentWord"] = null;
    updates["gameState/startTime"] = null;
    updates["gameState/timerDuration"] = null;
    updates[`players/${currentUserId}/status`] = "eliminated";
    return updates;
  }

  if (wasEliminated && currentUserId) {
    updates[`players/${currentUserId}/status`] = "eliminated";
    const elapsed = (now - startTime) / 1000;
    updates["gameState/frozenTimeLeft"] = Math.max(0, timerDuration - elapsed);
  } else if (currentUserId) {
    updates[`players/${currentUserId}/score`] = currentScore + 1;
  }

  const eliminatedPlayerId = wasEliminated ? currentUserId ?? undefined : undefined;
  const { aliveAfterTurn, shouldTriggerIntermission } = getPostTurnState(
    players,
    eliminatedPlayerId,
  );

  if (shouldTriggerIntermission) {
    updates.status = "intermission";
    updates.intermissionEndsAt = now + INTERMISSION_DURATION_MS;
    updates["gameState/currentWord"] = null;
    updates["gameState/currentTurnPlayerId"] = null;

    if (aliveAfterTurn.length === 1) {
      updates["gameState/winnerId"] = aliveAfterTurn[0].id;
      updates["gameState/winnerName"] = aliveAfterTurn[0].name;
    }

    return updates;
  }

  const nextPlayerId =
    findNextActiveTurnPlayer(turnOrder, currentTurnPlayerId, aliveAfterTurn) ||
    currentTurnPlayerId ||
    null;

  updates["gameState/currentTurnPlayerId"] = nextPlayerId;
  updates["gameState/currentWord"] = null;
  updates["gameState/startTime"] = null;
  updates["gameState/timerDuration"] = null;
  updates["gameState/currentInput"] = "";

  return updates;
};
