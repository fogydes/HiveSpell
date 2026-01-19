import React, { createContext, useContext, useState, useEffect } from "react";
import { Room, GameSettings, Player } from "../types/multiplayer";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  subscribeToRoom,
  findPublicRoom,
} from "../services/multiplayerService";
import { useAuth } from "./AuthContext";
import { db } from "../firebase";
import { ref, get } from "firebase/database";

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
      // Use sendBeacon for reliable disconnect signaling
      const data = JSON.stringify({ status: "disconnected" });
      navigator.sendBeacon(`/api/disconnect`, data); // This won't work without API, fallback below

      // Fallback: synchronous Firebase update (may not always complete)
      leaveRoom(currentRoom.id, user.uid);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [currentRoom?.id, user?.uid]);

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
      const roomId = await createRoom(user.uid, hostName, settings, type);

      // Fetch FRESH user stats directly from Firebase (fixes mobile timing issues)
      let freshCorrects = userData?.corrects || 0;
      let freshWins = userData?.wins || 0;
      try {
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const freshData = snapshot.val();
          freshCorrects = freshData.corrects || 0;
          freshWins = freshData.wins || 0;
          console.log("[CreateRoom] Fetched fresh stats from Firebase:", {
            corrects: freshCorrects,
            wins: freshWins,
          });
        }
      } catch (fetchErr) {
        console.warn(
          "[CreateRoom] Failed to fetch fresh stats, using cached:",
          fetchErr,
        );
      }

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
            corrects: freshCorrects,
            wins: freshWins,
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

      // Fetch FRESH user stats directly from Firebase (fixes mobile timing issues)
      let freshCorrects = userData?.corrects || 0;
      let freshWins = userData?.wins || 0;
      try {
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const freshData = snapshot.val();
          freshCorrects = freshData.corrects || 0;
          freshWins = freshData.wins || 0;
          console.log("[JoinRoom] Fetched fresh stats from Firebase:", {
            corrects: freshCorrects,
            wins: freshWins,
          });
        }
      } catch (fetchErr) {
        console.warn(
          "[JoinRoom] Failed to fetch fresh stats, using cached:",
          fetchErr,
        );
      }

      console.log("[JoinRoom] Final stats:", {
        corrects: freshCorrects,
        wins: freshWins,
        username: userData?.username,
      });

      const player: Player = {
        id: user.uid,
        name: userData.username,
        isHost: false,
        score: 0,
        corrects: freshCorrects,
        wins: freshWins,
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
