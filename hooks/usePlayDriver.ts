import { useCallback, useEffect, useRef } from "react";
import { supabase } from "../services/supabase";
import { getWordBankForLocale } from "../services/gameService";
import i18n from "../i18n";
import {
  appendRecentWord,
  pickRandomWord,
  pickWordAvoidingRecent,
} from "../services/playWordUtils";
import type { Player, Room } from "../types/multiplayer";

interface UsePlayDriverArgs {
  currentRoom?: Room | null;
  isLocalDriver: boolean;
  paramMode?: string;
  playersList: Player[];
}

export const usePlayDriver = ({
  currentRoom,
  isLocalDriver,
  paramMode,
  playersList,
}: UsePlayDriverArgs) => {
  const locale = i18n.language;
  const wordBank = getWordBankForLocale(locale);
  const disconnectedTurnHandlerRef = useRef(false);
  const processingRef = useRef(false);
  const timerExpirationRef = useRef(false);

  const callRpc = useCallback(async (rpcName: string, args: Record<string, any>) => {
    if (!currentRoom?.id) return { success: false, error: "No room" };

    const { data, error } = await supabase.rpc(rpcName, {
      p_room_id: currentRoom.id,
      ...args,
    });

    if (error) {
      console.error(`[Driver RPC ${rpcName}] Error:`, error);
      throw error;
    }

    return data;
  }, [currentRoom?.id]);

  // Driver no longer writes to Firebase directly.
  // Instead, it calls Supabase RPCs that atomically validate and apply changes.
  // The realtime subscription in MultiplayerContext will pick up the room changes.

  const handleDriverElimination = useCallback(
    async ({
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

      // For timer expiration/disconnection, we call eliminate_player RPC
      // The RPC handles intermission logic atomically
      try {
        await callRpc("eliminate_player", {
          p_player_id: currentTurnPlayerId,
          p_reason: reason,
        });
      } catch (error) {
        console.error("[Driver] Failed to eliminate player via RPC:", error);
        throw error;
      }
    },
    [currentRoom, callRpc],
  );

  useEffect(() => {
    if (!isLocalDriver) return;
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
  }, [currentRoom, handleDriverElimination, isLocalDriver, playersList]);

  useEffect(() => {
    if (!isLocalDriver) return;
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
    isLocalDriver,
  ]);

  useEffect(() => {
    if (!isLocalDriver || !currentRoom?.id) return;

    // Game start: when room transitions from waiting to playing
    // The actual game start is now handled by the host calling start_game RPC
    // This effect only handles intermission -> playing (round restart)

    if (
      currentRoom.status === "intermission" &&
      currentRoom.intermissionEndsAt
    ) {
      const safeTimeRemaining = Math.max(
        currentRoom.intermissionEndsAt - Date.now(),
        1000,
      );
      const timerId = setTimeout(async () => {
        try {
          await callRpc("restart_round", {});
        } catch (error) {
          console.error("[Driver] Failed to restart round via RPC:", error);
        }
      }, safeTimeRemaining);

      return () => clearTimeout(timerId);
    }
  }, [
    currentRoom,
    currentRoom?.intermissionEndsAt,
    currentRoom?.status,
    isLocalDriver,
    callRpc,
  ]);
};