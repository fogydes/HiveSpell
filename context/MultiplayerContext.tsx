import React, { createContext, useContext, useState, useEffect } from "react";
import { Room, GameSettings, Player } from "../types/multiplayer";
import { ref as dbRef, update as dbUpdate } from "firebase/database";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  subscribeToRoom,
  findPublicRoom,
} from "../services/multiplayerService";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";

interface MultiplayerContextType {
  currentRoom: Room | null;
  players: Player[];
  loading: boolean;
  error: string | null;
  createGameRoom: (
    settings: GameSettings,
    type: "public" | "private",
  ) => Promise<string>;
  joinGameRoom: (roomId: string) => Promise<void>;
  joinPublicGame: (difficulty: string) => Promise<void>;
  leaveGameRoom: () => Promise<void>;
}

const MultiplayerContext = createContext<MultiplayerContextType>({
  currentRoom: null,
  players: [],
  loading: false,
  error: null,
  createGameRoom: async () => "",
  joinGameRoom: async () => {},
  joinPublicGame: async () => {},
  leaveGameRoom: async () => {},
});

export const useMultiplayer = () => useContext(MultiplayerContext);

export const MultiplayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, userData } = useAuth();
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProfileSnapshotStats = () => ({
    corrects: userData?.corrects ?? 0,
    wins: userData?.wins ?? 0,
  });

  // Subscribe to room updates when currentRoom changes
  useEffect(() => {
    if (!currentRoom?.id) return;

    const unsubscribe = subscribeToRoom(currentRoom.id, (updatedRoom) => {
      if (updatedRoom) {
        setCurrentRoom(updatedRoom);
      } else {
        // Room was deleted or player removed
        setCurrentRoom(null);
      }
    });

    return () => unsubscribe();
  }, [currentRoom?.id]);

  // Handle tab close / refresh - mark player as disconnected
  useEffect(() => {
    if (!currentRoom?.id || !user?.uid) return;

    const handleBeforeUnload = () => {
      leaveRoom(currentRoom.id, user.uid);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [currentRoom?.id, user?.uid]);

  // Backfill the current room snapshot once profile hydration finishes.
  useEffect(() => {
    if (!currentRoom?.id || !user?.uid || !userData) return;

    const roomPlayer = currentRoom.players?.[user.uid];
    if (!roomPlayer) return;

    const nextUsername = userData.username || roomPlayer.name || "Player";
    const nextCorrects = userData.corrects ?? 0;
    const nextWins = userData.wins ?? 0;

    const updates: Record<string, string | number> = {};

    if (roomPlayer.name !== nextUsername) {
      updates[`players/${user.uid}/name`] = nextUsername;
    }

    if ((roomPlayer.corrects ?? 0) !== nextCorrects) {
      updates[`players/${user.uid}/corrects`] = nextCorrects;
    }

    if ((roomPlayer.wins ?? 0) !== nextWins) {
      updates[`players/${user.uid}/wins`] = nextWins;
    }

    if (Object.keys(updates).length === 0) {
      return;
    }

    dbUpdate(dbRef(db, `rooms/${currentRoom.id}`), updates).catch((err: any) =>
      console.error("[Multiplayer] Failed to sync room profile snapshot:", err),
    );
  }, [
    currentRoom?.id,
    currentRoom?.players,
    user?.uid,
    userData?.corrects,
    userData?.username,
    userData?.wins,
  ]);

  const createGameRoom = async (
    settings: GameSettings,
    type: "public" | "private",
  ): Promise<string> => {
    if (!user) {
      setError("Must be logged in to create a room");
      return "";
    }
    setLoading(true);
    setError(null);
    const hostName = userData?.username || "Player";
    try {
      const { corrects: profileCorrects, wins: profileWins } =
        getProfileSnapshotStats();

      // Create room with the current persistent profile snapshot.
      const roomId = await createRoom(
        user.uid,
        hostName,
        settings,
        type,
        profileCorrects,
        profileWins,
      );

      setCurrentRoom({
        id: roomId,
        settings,
        type,
        hostId: user.uid,
        players: {
          [user.uid]: {
            id: user.uid,
            name: hostName,
            isHost: true,
            score: 0,
            corrects: profileCorrects,
            wins: profileWins,
            status: "connected",
          },
        },
      } as Room);
      return roomId;
    } catch (err: any) {
      setError(err.message);
      return "";
    } finally {
      setLoading(false);
    }
  };

  const joinGameRoom = async (roomId: string) => {
    if (!user || !userData) {
      setError("Must be logged in to join");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Leave current room first (if any)
      if (currentRoom?.id && currentRoom.id !== roomId) {
        console.log(
          "[Context] Leaving current room before joining new one:",
          currentRoom.id,
        );
        await leaveRoom(currentRoom.id, user.uid);
      }

      const { corrects: profileCorrects, wins: profileWins } =
        getProfileSnapshotStats();

      console.log("[JoinRoom] Final stats:", {
        corrects: profileCorrects,
        wins: profileWins,
        username: userData?.username,
      });

      const player: Player = {
        id: user.uid,
        name: userData.username,
        isHost: false,
        score: 0,
        corrects: profileCorrects,
        wins: profileWins,
        status: "connected",
      };
      console.log("[JoinRoom] Player object:", player);
      await joinRoom(roomId, player);
      setCurrentRoom({ id: roomId } as Room); // Trigger subscription
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const leaveGameRoom = async () => {
    if (!currentRoom || !user) return;
    setLoading(true);
    try {
      await leaveRoom(currentRoom.id, user.uid);
      setCurrentRoom(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const joinPublicGame = async (difficulty: string) => {
    console.log("[JoinPublic] Starting for difficulty:", difficulty);
    if (!user) {
      console.error("[JoinPublic] No user!");
      setError("Must be logged in to join");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1. Try to find an existing room
      console.log("[JoinPublic] Searching for existing room...");
      const existingRoomId = await findPublicRoom(difficulty);

      if (existingRoomId) {
        console.log("[JoinPublic] Found room:", existingRoomId);
        // 2. Join it
        await joinGameRoom(existingRoomId);
        console.log("[JoinPublic] Joined room successfully.");
      } else {
        console.log("[JoinPublic] No room found, creating new...");
        // 3. Create new one
        const newRoomId = await createGameRoom(
          { difficulty, maxPlayers: 10 },
          "public",
        );
        console.log("[JoinPublic] Created room:", newRoomId);
      }
    } catch (err: any) {
      console.error("[JoinPublic] ERROR:", err);
      setError(err.message);
      throw err; // Re-throw so Lobby's catch block sees it
    } finally {
      setLoading(false);
    }
  };

  const players = currentRoom ? Object.values(currentRoom.players || {}) : [];

  return (
    <MultiplayerContext.Provider
      value={{
        currentRoom,
        players,
        loading,
        error,
        createGameRoom,
        joinGameRoom,
        joinPublicGame,
        leaveGameRoom,
      }}
    >
      {children}
    </MultiplayerContext.Provider>
  );
};
