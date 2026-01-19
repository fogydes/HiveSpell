export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  score: number; // Room-specific score for current session
  corrects: number; // Global corrects from user profile
  wins: number; // Global wins from user profile
  status: "alive" | "eliminated" | "spectating" | "connected" | "disconnected";
}

export interface GameSettings {
  difficulty: string;
  maxPlayers: number;
}

export interface GameState {
  currentWord: string;
  currentWordIndex: number;
  startTime: number;
  timerDuration?: number;
  currentTurnPlayerId?: string; // Who's turn it is
  turnOrder?: string[]; // Array of player IDs in turn order
  currentInput?: string; // Synced typing from current player
}

export interface Room {
  id: string;
  hostId: string;
  type: "public" | "private";
  status: "waiting" | "playing" | "finished";
  createdAt: number;
  code?: string; // Optional for public rooms
  settings: GameSettings;
  players: Record<string, Player>;
  gameState?: GameState;
}
