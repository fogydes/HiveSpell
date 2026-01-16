import { db } from '../firebase';
import { ref, set, push, get, update, query, orderByChild, equalTo, limitToFirst, onValue, off, remove } from 'firebase/database';
import { Room, Player, GameSettings } from '../types/multiplayer';

export const createRoom = async (hostId: string, settings: GameSettings, type: 'public' | 'private'): Promise<string> => {
  const roomsRef = ref(db, 'rooms');
  const newRoomRef = push(roomsRef);
  const roomId = newRoomRef.key as string;
  
  // Only generate code for private rooms
  const code = type === 'private' ? Math.random().toString(36).substring(2, 8).toUpperCase() : null;

  const newRoom: any = {
    id: roomId,
    hostId,
    type,
    status: 'waiting',
    createdAt: Date.now(),
    settings,
    players: {},
    gameState: {
        currentWord: '',
        currentWordIndex: 0,
        startTime: 0
    }
  };
  
  if (code) newRoom.code = code;

  // Add host as player
  newRoom.players[hostId] = {
      id: hostId,
      name: 'Host', 
      isHost: true,
      score: 0,
      status: 'connected'
  };

  await set(newRoomRef, newRoom);
  return roomId;
};

export const joinRoom = async (roomId: string, player: Player): Promise<void> => {
  const playerRef = ref(db, `rooms/${roomId}/players/${player.id}`);
  await set(playerRef, player);
};

export const leaveRoom = async (roomId: string, playerId: string): Promise<void> => {
  const playerRef = ref(db, `rooms/${roomId}/players/${playerId}`);
  await remove(playerRef);
};

export const subscribeToRoom = (roomId: string, callback: (room: Room | null) => void): () => void => {
  const roomRef = ref(db, `rooms/${roomId}`);
  const listener = onValue(roomRef, (snapshot) => {
    callback(snapshot.val());
  });
  return () => off(roomRef, 'value', listener);
};