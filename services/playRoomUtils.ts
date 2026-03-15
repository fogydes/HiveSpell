import type { Player } from "../types/multiplayer";

export const isActiveTurnPlayer = (player: Player) =>
  player.status === "alive" || player.status === "connected";

export const getActiveTurnPlayers = (players: Player[]) =>
  players.filter(isActiveTurnPlayer);

export const calculateTurnDuration = (word: string, streak: number) => {
  const reduction = Math.floor(streak / 10) * 0.3;
  const baseTime = 2 + word.length;
  return Math.max(2.5, baseTime - reduction);
};

export const findNextActiveTurnPlayer = (
  turnOrder: string[],
  currentTurnPlayerId: string | null | undefined,
  eligiblePlayers: Player[],
) => {
  if (turnOrder.length === 0) {
    return eligiblePlayers[0]?.id ?? null;
  }

  const currentIndex = turnOrder.indexOf(currentTurnPlayerId || "");

  for (let offset = 1; offset <= turnOrder.length; offset += 1) {
    const candidateIndex = (Math.max(currentIndex, -1) + offset) % turnOrder.length;
    const candidateId = turnOrder[candidateIndex];

    if (eligiblePlayers.some((player) => player.id === candidateId)) {
      return candidateId;
    }
  }

  return eligiblePlayers[0]?.id ?? null;
};

export const getRoundTurnOrder = (players: Player[]) =>
  getActiveTurnPlayers(players)
    .slice()
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0))
    .map((player) => player.id);

export const getPostTurnState = (
  players: Player[],
  eliminatedPlayerId?: string,
) => {
  const aliveAfterTurn = players.filter(
    (player) =>
      isActiveTurnPlayer(player) && player.id !== eliminatedPlayerId,
  );
  const activePlayersCount = players.filter(
    (player) =>
      player.status !== "spectating" && player.status !== "disconnected",
  ).length;

  const someoneWon =
    aliveAfterTurn.length === 1 && activePlayersCount > 1;
  const everyoneEliminated = aliveAfterTurn.length === 0;

  return {
    activePlayersCount,
    aliveAfterTurn,
    shouldTriggerIntermission: someoneWon || everyoneEliminated,
    someoneWon,
    everyoneEliminated,
  };
};
