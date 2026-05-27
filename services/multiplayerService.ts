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
  onDisconnect,
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

  // Register onDisconnect handler to mark player as disconnected if they lose connection/close tab
  await onDisconnect(playerRef).update({ status: "disconnected" });
};

export const leaveRoom = async (
  roomId: string,
  playerId: string,
): Promise<void> => {
  try {
    const playerRef = ref(db, `rooms/${roomId}/players/${playerId}`);
    // Mark player as disconnected. We don't remove them yet to allow reconnection
    // if it was just a network blip.
    await update(playerRef, { status: "disconnected" });
    console.log(`[LeaveRoom] Marked player ${playerId} as disconnected`);

    // Check if ALL players are disconnected to clean up room immediately
    const roomRef = ref(db, `rooms/${roomId}`);
    const roomSnap = await get(roomRef);

    if (roomSnap.exists()) {
      const roomData = roomSnap.val();
      const players = roomData.players || {};
      const playerList = Object.values(players) as any[];

      // If no players or everyone is disconnected, delete the room
      const activePlayers = playerList.filter(
        (p) => p.status !== "disconnected",
      );

      if (activePlayers.length === 0) {
        console.log(
          `[LeaveRoom] No active players left, deleting room: ${roomId}`,
        );
        await remove(roomRef);
      }
    }
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
  // Query for public rooms.
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
    const players = room.players || {};
    const playerList = Object.values(players) as any[];
    const activePlayers = playerList.filter((p) => p.status !== "disconnected");

    // Proactive cleanup: If we find a room with no active players, delete it
    if (activePlayers.length === 0) {
      console.log(`[FindPublicRoom] Cleaning up zombie room: ${id}`);
      remove(ref(db, `rooms/${id}`)).catch(() => {}); // Fire and forget
      continue;
    }

    if (
      room.settings?.difficulty === difficulty &&
      room.status !== "finished" && // Can join waiting or playing
      activePlayers.length < (room.settings.maxPlayers || 10)
    ) {
      return id;
    }
  }

  return null;
};
