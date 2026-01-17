export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  score: number; // Used as 'corrects'
  wins: number;
  status: 'alive' | 'eliminated' | 'spectating' | 'connected' | 'disconnected'; // Expanded status
}

export interface GameSettings {
  difficulty: string;
  maxPlayers: number;
}

export interface GameState {
  currentWord: string;
  currentWordIndex: number;
  startTime: number;
}

export interface Room {
  id: string;
  hostId: string;
  type: 'public' | 'private';
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
  code?: string; // Optional for public rooms
  settings: GameSettings;
  players: Record<string, Player>;
  gameState?: GameState;
}
