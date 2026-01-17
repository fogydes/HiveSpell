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

  // Add host as player
  newRoom.players[hostId] = {
    id: hostId,
    name: hostName,
    isHost: true,
    score: 0,
    wins: 0,
    status: "connected",
  };

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

  // Late joiners are spectators. New rooms (waiting) or Intermission -> Connected (Ready for next round)
  // Actually, per your rules: "If a player joins between the round they are to put in spectating mode"
  const initialStatus = isGameRunning ? "spectating" : "connected";

  // Check for existing player data to persist stats
  let finalPlayer = { ...player, status: initialStatus };

  if (roomVal.players && roomVal.players[player.id]) {
    const existing = roomVal.players[player.id];
    // console.log(`[Join] Found existing player stats for ${player.name}: Score ${existing.score}, Wins ${existing.wins}`);
    finalPlayer = {
      ...finalPlayer,
      score: existing.score || 0,
      wins: existing.wins || 0,
    };
  }

  const playerRef = ref(db, `rooms/${roomId}/players/${player.id}`);
  await set(playerRef, finalPlayer);
};

export const leaveRoom = async (
  roomId: string,
  playerId: string,
): Promise<void> => {
  const playerRef = ref(db, `rooms/${roomId}/players/${playerId}`);
  // Don't delete, just mark disconnected so we can persist scores on rejoin
  await update(playerRef, { status: "disconnected" });
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
