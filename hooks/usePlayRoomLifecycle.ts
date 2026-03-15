import { useEffect, useRef } from "react";
import { onDisconnect, ref as dbRef } from "firebase/database";
import { db } from "../firebase";
import { leaveRoom } from "../services/multiplayerService";
import type { Room } from "../types/multiplayer";

interface UsePlayRoomLifecycleArgs {
  contextLoading: boolean;
  currentRoom?: Room | null;
  onMissingRoom: () => void;
  userId?: string | null;
}

export const usePlayRoomLifecycle = ({
  contextLoading,
  currentRoom,
  onMissingRoom,
  userId,
}: UsePlayRoomLifecycleArgs) => {
  const hasAttemptedLoadRef = useRef(false);
  const currentRoomRef = useRef(currentRoom);
  currentRoomRef.current = currentRoom;

  useEffect(() => {
    if (!hasAttemptedLoadRef.current) {
      hasAttemptedLoadRef.current = true;
      return;
    }

    if (!contextLoading && !currentRoom) {
      const timer = setTimeout(() => {
        if (!currentRoomRef.current) {
          console.warn("No Room Context found after delay, redirecting to lobby...");
          onMissingRoom();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [contextLoading, currentRoom, onMissingRoom]);

  useEffect(() => {
    if (!currentRoom?.id || !userId) return;

    const playerStatusRef = dbRef(
      db,
      `rooms/${currentRoom.id}/players/${userId}/status`,
    );

    const onDisconnectRef = onDisconnect(playerStatusRef);
    onDisconnectRef.set("disconnected");
    console.log("[Play] onDisconnect hook set up for player:", userId);

    const handleBeforeUnload = () => {
      leaveRoom(currentRoom.id, userId);
    };

    const handlePopState = () => {
      leaveRoom(currentRoom.id, userId);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      onDisconnectRef.cancel();
    };
  }, [currentRoom?.id, userId]);
};
