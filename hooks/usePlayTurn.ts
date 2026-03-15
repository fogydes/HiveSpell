import { useRef } from "react";
import { ref as dbRef, runTransaction, update as dbUpdate } from "firebase/database";
import { db } from "../firebase";
import { applyCorrectAnswerReward } from "../services/profileService";
import { hasOtherConnectedRoomPlayer } from "../services/playRoomUtils";
import { getCorrectAnswerNectarReward } from "../services/playRewardUtils";
import { buildPassTurnRoomUpdate } from "../services/playUpdateUtils";
import type { Player, Room } from "../types/multiplayer";

interface UsePlayTurnArgs {
  currentRoom?: Room | null;
  currentWord: string;
  playersList: Player[];
  refreshUser: () => Promise<void>;
  userDisplayName?: string | null;
  username?: string | null;
  userId?: string | null;
}

export const usePlayTurn = ({
  currentRoom,
  currentWord,
  playersList,
  refreshUser,
  userDisplayName,
  username,
  userId,
}: UsePlayTurnArgs) => {
  const passingTurnRef = useRef(false);

  const passTurn = async (wasEliminated: boolean) => {
    if (!currentRoom?.id) return;

    if (passingTurnRef.current) {
      console.warn("[PassTurn] Already in progress, skipping.");
      return;
    }

    passingTurnRef.current = true;
    const roomId = currentRoom.id;
    const currentScore = playersList.find((player) => player.id === userId)?.score || 0;
    const updates = buildPassTurnRoomUpdate({
      currentScore,
      currentTurnPlayerId: currentRoom.gameState?.currentTurnPlayerId,
      currentUserId: userId,
      players: playersList,
      startTime: currentRoom.gameState?.startTime || Date.now(),
      timerDuration: currentRoom.gameState?.timerDuration || 10,
      turnOrder: currentRoom.gameState?.turnOrder || [],
      wasEliminated,
    });

    try {
      await dbUpdate(dbRef(db, `rooms/${roomId}`), updates);
    } catch (error) {
      console.error("[PassTurn] Firebase update failed:", error);
    }
    passingTurnRef.current = false;

    const shouldAwardPersistentCorrects =
      !wasEliminated &&
      userId &&
      hasOtherConnectedRoomPlayer(playersList, userId);

    if (shouldAwardPersistentCorrects && userId) {
      const { difficulty, nectarToAdd } = getCorrectAnswerNectarReward(
        currentRoom.settings?.difficulty,
        currentWord,
      );

      console.log(`[Stats] Adding ${nectarToAdd} nectar for difficulty: ${difficulty}`);

      applyCorrectAnswerReward(
        userId,
        userDisplayName || username || "Player",
        nectarToAdd,
      )
        .then(() => refreshUser())
        .catch((error: any) =>
          console.error("Persistent reward update failed:", error),
        );
    }
  };

  const updateCompetitiveRoomCorrects = async () => {
    const isCompetitiveRoom = hasOtherConnectedRoomPlayer(playersList, userId);
    if (!isCompetitiveRoom || !userId || !currentRoom?.id) {
      return;
    }

    try {
      const playerRef = dbRef(db, `rooms/${currentRoom.id}/players/${userId}`);
      await runTransaction(playerRef, (player: any) => {
        if (player) {
          player.corrects = (player.corrects || 0) + 1;
          player.score = (player.score || 0) + 10;
        }
        return player;
      });
    } catch (error) {
      console.error("Failed to update room player stats:", error);
    }
  };

  return {
    passTurn,
    updateCompetitiveRoomCorrects,
  };
};
