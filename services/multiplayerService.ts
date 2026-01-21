import { db } from "../firebase";
import {
  ref,
  set,
  push,
  get,
  update,
  query,
  orderByChild,
  equalTo,
  limitToFirst,
  onValue,
  off,
  remove,
} from "firebase/database";
import { Room, Player, GameSettings } from "../types/multiplayer";

export const createRoom = async (
  hostId: string,
  hostName: string,
  settings: GameSettings,
  type: "public" | "private",
  hostCorrects: number = 0,
  hostWins: number = 0,
): Promise<string> => {
  const roomsRef = ref(db, "rooms");
  const newRoomRef = push(roomsRef);
  const roomId = newRoomRef.key as string;

  // Only generate code for private rooms
  const code =
    type === "private"
      ? Math.random().toString(36).substring(2, 8).toUpperCase()
      : null;

  const newRoom: any = {
    id: roomId,
    hostId,
    type,
    status: "playing",
    createdAt: Date.now(),
    settings,
    players: {},
    gameState: {
      currentWord: "",
      currentWordIndex: 0,
      startTime: 0,
    },
  };

  if (code) newRoom.code = code;

  // Add host as player with their actual stats
  newRoom.players[hostId] = {
    id: hostId,
    name: hostName,
    isHost: true,
    score: 0,
    corrects: hostCorrects,
    wins: hostWins,
    status: "connected",
  };

  console.log("[CreateRoom] Host stats in Firebase:", {
    corrects: hostCorrects,
    wins: hostWins,
  });

  await set(newRoomRef, newRoom);
  return roomId;
};

export const joinRoom = async (
  roomId: string,
  player: Player,
): Promise<void> => {
  const roomRef = ref(db, `rooms/${roomId}`);
  const roomSnap = await get(roomRef);

  if (!roomSnap.exists()) {
    throw new Error("Room does not exist");
  }

  const roomVal = roomSnap.val();
  const isGameRunning = roomVal.status === "playing";

  // Late joiners are spectators. Waiting/Intermission -> Connected (Ready for next round)
  // ALWAYS reset status on join (don't carry over "eliminated" from previous rounds)
  const initialStatus = isGameRunning ? "spectating" : "connected";

  // Check for existing player data to persist stats (score/wins only, NOT status)
  let finalPlayer = { ...player, status: initialStatus, joinedAt: Date.now() };

  if (roomVal.players && roomVal.players[player.id]) {
    const existing = roomVal.players[player.id];
    console.log(
      `[Join] Found existing player, preserving room score: ${existing.score}`,
    );
    finalPlayer = {
      ...finalPlayer,
      score: existing.score || 0, // Only preserve room score
      joinedAt: existing.joinedAt || finalPlayer.joinedAt, // Preserve original join time
      // corrects and wins come fresh from user profile on join, don't overwrite
    };
  }

  const playerRef = ref(db, `rooms/${roomId}/players/${player.id}`);
  await set(playerRef, finalPlayer);
};

export const leaveRoom = async (
  roomId: string,
  playerId: string,
): Promise<void> => {
  try {
    const playerRef = ref(db, `rooms/${roomId}/players/${playerId}`);
    // Mark player as disconnected
    await update(playerRef, { status: "disconnected" });
    console.log(`[LeaveRoom] Marked player ${playerId} as disconnected`);

    // After a short delay, check if ALL players are disconnected
    // This delay prevents race conditions where remaining players haven't updated yet
    setTimeout(async () => {
      try {
        const roomRef = ref(db, `rooms/${roomId}`);
        const roomSnap = await get(roomRef);

        if (roomSnap.exists()) {
          const roomData = roomSnap.val();
          const players = roomData.players || {};
          const playerList = Object.values(players) as any[];

          // Only delete if there are players AND all of them are disconnected
          if (playerList.length > 0) {
            const allDisconnected = playerList.every(
              (p) => p.status === "disconnected",
            );

            if (allDisconnected) {
              console.log(
                `[LeaveRoom] All players disconnected after delay, deleting room: ${roomId}`,
              );
              await remove(roomRef);
            }
          }
        }
      } catch (cleanupErr) {
        console.warn(`[LeaveRoom] Cleanup check failed:`, cleanupErr);
      }
    }, 3000); // 3 second delay before cleanup check
  } catch (err) {
    console.error(`[LeaveRoom] Error leaving room:`, err);
  }
};

export const subscribeToRoom = (
  roomId: string,
  callback: (room: Room | null) => void,
): (() => void) => {
  const roomRef = ref(db, `rooms/${roomId}`);
  const listener = onValue(roomRef, (snapshot) => {
    callback(snapshot.val());
  });
  return () => off(roomRef, "value", listener);
};
// Find a public room with matching difficulty
export const findPublicRoom = async (
  difficulty: string,
): Promise<string | null> => {
  const roomsRef = ref(db, "rooms");
  // Query for public rooms. Note: Ideally we'd index this.
  // We limit to 50 to avoid fetching too many.
  const publicRoomsQuery = query(
    roomsRef,
    orderByChild("type"),
    equalTo("public"),
    limitToFirst(50),
  );

  const snapshot = await get(publicRoomsQuery);

  if (!snapshot.exists()) return null;

  const rooms = snapshot.val();
  // Client-side filter for specificity (Firebase RDB limits multiple queries)
  for (const [id, room] of Object.entries(rooms) as [string, any][]) {
    if (
      room.settings?.difficulty === difficulty &&
      room.status !== "finished" && // Can join waiting or playing
      (!room.players ||
        Object.keys(room.players).length < (room.settings.maxPlayers || 10))
    ) {
      return id;
    }
  }

  return null;
};
