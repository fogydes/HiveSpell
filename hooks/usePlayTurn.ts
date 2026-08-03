import { useRef } from "react";
import { supabase } from "../services/supabase";
import { applyCorrectAnswerReward } from "../services/profileService";
import { hasOtherConnectedRoomPlayer } from "../services/playRoomUtils";
import { getCorrectAnswerNectarReward } from "../services/playRewardUtils";
import { logInfo, logSupabaseRpcError } from "../services/logger";
import { useGameplayEvents } from "./useGameplayEvents";
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
  const { emit } = useGameplayEvents();

  const passTurn = async (wasEliminated: boolean, wpm?: number, newStreak?: number) => {
    if (!currentRoom?.id || !userId) return;

    if (passingTurnRef.current) {
      console.warn("[PassTurn] Already in progress, skipping.");
      return;
    }

    passingTurnRef.current = true;

    try {
      // Call advance_turn RPC instead of Firebase RTDB update
      const { data, error } = await supabase.rpc("advance_turn", {
        p_room_id: currentRoom.id,
        p_player_id: userId,
        p_was_correct: !wasEliminated,
        p_new_streak: newStreak || 0,
      });

      if (error) {
        logSupabaseRpcError("advance_turn", error);
        throw error;
      }
    } catch (error) {
      logSupabaseRpcError("advance_turn", error);
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

      logInfo(`Adding ${nectarToAdd} nectar for difficulty: ${difficulty}`);

      applyCorrectAnswerReward(
        userId,
        userDisplayName || username || "Player",
        nectarToAdd,
      )
        .then(() => refreshUser())
        .catch((error: Error) =>
          logSupabaseRpcError("applyCorrectAnswerReward", error),
        );

      // Emit correct answer event
      const streak = playersList.find((p) => p.id === userId)?.streak || 0;
      emit({
        type: "ANSWER_CORRECT",
        word: currentWord,
        wpm: wpm || 0,
        streak,
        timeTakenMs: 0,
        timestamp: Date.now(),
      });

      // Emit streak milestone event if this is a milestone
      const milestones = [5, 10, 15, 20, 25, 30, 40, 50] as const;
      if (milestones.includes(streak as 5 | 10 | 15 | 20 | 25 | 30 | 40 | 50)) {
        emit({
          type: "STREAK_MILESTONE",
          streak,
          milestone: streak as 5 | 10 | 15 | 20 | 25 | 30 | 40 | 50,
          timestamp: Date.now(),
        });
      }
    } else if (wasEliminated) {
      // Emit elimination event
      const playerIndex = playersList.findIndex((p) => p.id === userId);
      const place = playerIndex >= 0 ? playersList.length - playerIndex : 0;
      emit({
        type: "PLAYER_ELIMINATED",
        playerId: userId || "",
        playerName: username || userDisplayName || "Player",
        place,
        totalPlayers: playersList.length,
        timestamp: Date.now(),
      });
    }

    // Emit turn handoff event (for both correct answers and eliminations)
    const turnOrder = currentRoom.gameState?.turnOrder || [];
    const alivePlayers = playersList.filter((p) => p.status !== "disconnected");
    let nextPlayerId = currentRoom.gameState?.currentTurnPlayerId;
    let remainingTime = currentRoom.gameState?.timerDuration || 10;

    if (!wasEliminated) {
      const currentIndex = turnOrder.indexOf(userId ?? "");
      for (let i = 1; i <= turnOrder.length; i++) {
        const nextIndex = (currentIndex + i) % turnOrder.length;
        const candidateId = turnOrder[nextIndex];
        const candidate = alivePlayers.find(p => p.id === candidateId);
        if (candidate && candidate.status !== "eliminated") {
          nextPlayerId = candidateId;
          break;
        }
      }
    } else if (alivePlayers.length > 0) {
      nextPlayerId = alivePlayers[0]?.id || "";
    }

    emit({
      type: "TURN_HANDOFF",
      from: userId ?? "",
      to: nextPlayerId ?? "",
      timeLeft: remainingTime,
      round: currentRoom?.gameState?.roundNumber || 1,
      timestamp: Date.now(),
    });
  };

  // updateCompetitiveRoomCorrects deprecated - room score now handled via RPC
  // const updateCompetitiveRoomCorrects = async () => {
  //   const isCompetitiveRoom = hasOtherConnectedRoomPlayer(playersList, userId);
  //   if (!isCompetitiveRoom || !userId || !currentRoom?.id) {
  //     return;
  //   }
  //
  //   try {
  //     const playerRef = dbRef(db, `rooms/${currentRoom.id}/players/${userId}`);
  //     await runTransaction(playerRef, (player: Player | null) => {
  //       if (player) {
  //         player.corrects = (player.corrects || 0) + 1;
  //         player.score = (player.score || 0) + 10;
  //       }
  //       return player;
  //     });
  //   } catch (error) {
  //     logFirebaseError("updateCompetitiveRoomCorrects", error);
  //   }
  // };

  return {
    passTurn,
    // updateCompetitiveRoomCorrects deprecated - room score now handled via RPC
  };
};
