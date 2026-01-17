import React, { createContext, useContext, useState, useEffect } from 'react';
import { Room, GameSettings, Player } from '../types/multiplayer';
import { createRoom, joinRoom, leaveRoom, subscribeToRoom } from '../services/multiplayerService';
import { useAuth } from './AuthContext';

interface MultiplayerContextType {
  currentRoom: Room | null;
  players: Player[];
  loading: boolean;
  error: string | null;
  createGameRoom: (settings: GameSettings, type: 'public' | 'private') => Promise<string>;
  joinGameRoom: (roomId: string) => Promise<void>;
  leaveGameRoom: () => Promise<void>;
}

const MultiplayerContext = createContext<MultiplayerContextType>({
  currentRoom: null,
  players: [],
  loading: false,
  error: null,
  createGameRoom: async () => '',
  joinGameRoom: async () => {},
  leaveGameRoom: async () => {},
});

export const useMultiplayer = () => useContext(MultiplayerContext);

export const MultiplayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  const createGameRoom = async (settings: GameSettings, type: 'public' | 'private'): Promise<string> => {
    if (!user) {
        setError("Must be logged in to create a room");
        return '';
    }
    setLoading(true);
    setError(null);
    const hostName = userData?.username || 'Player';
    try {
      const roomId = await createRoom(user.uid, hostName, settings, type);
      
      setCurrentRoom({ 
        id: roomId, 
        settings, 
        type,
        hostId: user.uid,
        // code is undefined for public, or we can fetch/predict it for private but better to wait for subscription
        players: {
            [user.uid]: {
                id: user.uid,
                name: hostName,
                isHost: true,
                score: 0,
                wins: 0,
                status: 'connected'
            }
        },
      } as Room); 
       return roomId;
    } catch (err: any) {
      setError(err.message);
      return '';
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
      const player: Player = {
        id: user.uid,
        name: userData.username,
        isHost: false,
        score: 0,
        status: 'connected'
      };
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
  
  const players = currentRoom ? Object.values(currentRoom.players || {}) : [];

  return (
    <MultiplayerContext.Provider value={{ 
        currentRoom, 
        players, 
        loading, 
        error, 
        createGameRoom, 
        joinGameRoom, 
        leaveGameRoom 
    }}>
      {children}
    </MultiplayerContext.Provider>
  );
};
