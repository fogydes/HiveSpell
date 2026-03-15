import { useCallback, useEffect, useRef } from "react";
import { ref as dbRef, update as dbUpdate } from "firebase/database";
import { db } from "../firebase";
import { wordBank } from "../services/gameService";
import {
  buildIntermissionRoomUpdate,
  buildNextTurnAfterEliminationUpdate,
  buildRoundRestartUpdate,
  buildWordAssignmentUpdate,
} from "../services/playUpdateUtils";
import {
  findNextActiveTurnPlayer,
  getActiveTurnPlayers,
} from "../services/playRoomUtils";
import {
  appendRecentWord,
  pickRandomWord,
  pickWordAvoidingRecent,
} from "../services/playWordUtils";
import type { Player, Room } from "../types/multiplayer";

interface UsePlayDriverArgs {
  currentRoom?: Room | null;
  isGameDriver: boolean;
  paramMode?: string;
  playersList: Player[];
}

export const usePlayDriver = ({
  currentRoom,
  isGameDriver,
  paramMode,
  playersList,
}: UsePlayDriverArgs) => {
  const disconnectedTurnHandlerRef = useRef(false);
  const processingRef = useRef(false);
  const timerExpirationRef = useRef(false);

  const handleDriverElimination = useCallback(
    ({
      allowSoloIntermission,
      currentTurnPlayerId,
      fallbackResetsStreak = false,
      reason,
    }: {
      allowSoloIntermission: boolean;
      currentTurnPlayerId: string;
      fallbackResetsStreak?: boolean;
      reason: string;
    }) => {
      if (!currentRoom) return;

      const roomId = currentRoom.id;
      const turnOrder = currentRoom.gameState?.turnOrder || [];
      const alivePlayers = getActiveTurnPlayers(playersList).filter(
        (player) => player.id !== currentTurnPlayerId,
      );

      console.log(
        `[Driver] ${reason} - alive players after elimination:`,
        alivePlayers.map((player) => player.name),
      );

      const shouldTriggerIntermission = allowSoloIntermission
        ? alivePlayers.length <= 1 || playersList.length === 1
        : alivePlayers.length <= 1 && playersList.length > 1;

      if (shouldTriggerIntermission) {
        const updates = buildIntermissionRoomUpdate({
          eliminatedPlayerId: currentTurnPlayerId,
          winner:
            alivePlayers.length === 1
              ? { id: alivePlayers[0].id, name: alivePlayers[0].name }
              : undefined,
        });

        return dbUpdate(dbRef(db, `rooms/${roomId}`), updates);
      }

      const nextPlayerId = findNextActiveTurnPlayer(
        turnOrder,
        currentTurnPlayerId,
        alivePlayers,
      );

      if (!nextPlayerId) {
        const fallbackUpdates = buildIntermissionRoomUpdate({
          eliminatedPlayerId: currentTurnPlayerId,
          resetStreak: fallbackResetsStreak,
        });
        return dbUpdate(dbRef(db, `rooms/${roomId}`), fallbackUpdates);
      }

      const difficulty = currentRoom.settings?.difficulty || paramMode || "baby";
      const newWord = pickRandomWord(wordBank[difficulty]);
      const currentStreak = currentRoom.gameState?.streak || 0;
      const updates = buildNextTurnAfterEliminationUpdate({
        currentStreak,
        eliminatedPlayerId: currentTurnPlayerId,
        newWord,
        nextPlayerId,
      });

      return dbUpdate(dbRef(db, `rooms/${roomId}`), updates);
    },
    [currentRoom, paramMode, playersList],
  );

  useEffect(() => {
    if (!isGameDriver) return;
    if (!currentRoom || currentRoom.status !== "playing") return;

    const currentTurnPlayerId = currentRoom.gameState?.currentTurnPlayerId;
    if (!currentTurnPlayerId) return;

    const currentTurnPlayer = playersList.find(
      (player) => player.id === currentTurnPlayerId,
    );

    if (currentTurnPlayer?.status !== "disconnected") {
      return;
    }

    if (disconnectedTurnHandlerRef.current) return;
    disconnectedTurnHandlerRef.current = true;

    handleDriverElimination({
      allowSoloIntermission: false,
      currentTurnPlayerId,
      reason: "Current turn player disconnected",
    })
      ?.then(() => {
        disconnectedTurnHandlerRef.current = false;
      })
      .catch((error) => {
        console.error("[Driver] Failed to process disconnected player:", error);
        disconnectedTurnHandlerRef.current = false;
      });
  }, [currentRoom, handleDriverElimination, isGameDriver, playersList]);

  useEffect(() => {
    if (!isGameDriver) return;
    if (!currentRoom || currentRoom.status !== "playing") return;

    const startTime = currentRoom.gameState?.startTime;
    const timerDuration = currentRoom.gameState?.timerDuration;
    const currentTurnPlayerId = currentRoom.gameState?.currentTurnPlayerId;
    if (!startTime || !timerDuration || !currentTurnPlayerId) return;

    const elapsed = (Date.now() - startTime) / 1000;
    const remaining = timerDuration - elapsed;
    if (remaining > -0.5) return;

    if (timerExpirationRef.current) return;
    timerExpirationRef.current = true;

    handleDriverElimination({
      allowSoloIntermission: true,
      currentTurnPlayerId,
      fallbackResetsStreak: true,
      reason: "Timer expired",
    })
      ?.then(() => {
        timerExpirationRef.current = false;
      })
      .catch((error) => {
        console.error("[Driver] Failed to handle timer expiration:", error);
        timerExpirationRef.current = false;
      });
  }, [
    currentRoom,
    currentRoom?.gameState?.currentTurnPlayerId,
    currentRoom?.gameState?.startTime,
    currentRoom?.status,
    handleDriverElimination,
    isGameDriver,
  ]);

  useEffect(() => {
    if (!isGameDriver || !currentRoom?.id) return;

    if (currentRoom.status === "waiting") {
      dbUpdate(dbRef(db, `rooms/${currentRoom.id}`), { status: "playing" })
        .catch((error) => console.error("[Driver] Failed to set status:", error));
      return;
    }

    if (currentRoom.status === "playing" && !currentRoom.gameState?.currentWord) {
      if (processingRef.current) return;
      processingRef.current = true;

      const difficulty = currentRoom.settings?.difficulty || paramMode || "baby";
      const allWords = wordBank[difficulty];
      const recentWords = currentRoom.gameState?.recentWords || [];
      const newWord = pickWordAvoidingRecent(allWords, recentWords);
      const updates = buildWordAssignmentUpdate({
        currentStreak: currentRoom.gameState?.streak || 0,
        existingTurnPlayerId: currentRoom.gameState?.currentTurnPlayerId,
        newWord,
        players: playersList,
        recentWords: appendRecentWord(recentWords, newWord),
      });

      dbUpdate(dbRef(db, `rooms/${currentRoom.id}/gameState`), updates)
        .then(() => {
          processingRef.current = false;
        })
        .catch((error) => {
          console.error("[Driver] Failed to set word:", error);
          processingRef.current = false;
        });
    }

    if (
      currentRoom.status === "intermission" &&
      currentRoom.intermissionEndsAt
    ) {
      const safeTimeRemaining = Math.max(
        currentRoom.intermissionEndsAt - Date.now(),
        1000,
      );
      const timerId = setTimeout(() => {
        const updates = buildRoundRestartUpdate({ players: playersList });
        dbUpdate(dbRef(db, `rooms/${currentRoom.id}`), updates).catch((error) =>
          console.error("[Driver] Failed to restart round:", error),
        );
      }, safeTimeRemaining);

      return () => clearTimeout(timerId);
    }
  }, [
    currentRoom,
    currentRoom?.gameState?.currentWord,
    currentRoom?.intermissionEndsAt,
    currentRoom?.status,
    isGameDriver,
    paramMode,
    playersList,
  ]);
};
