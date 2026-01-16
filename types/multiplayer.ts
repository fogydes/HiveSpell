export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
  status: 'connected' | 'disconnected';
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
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
  code: string;
  settings: GameSettings;
  players: Record<string, Player>;
  gameState?: GameState;
}
