export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  score: number; // Room-specific score for current session
  corrects: number; // Global corrects from user profile
  wins: number; // Global wins from user profile
  streak: number; // Current streak for the player
  status: "alive" | "eliminated" | "spectating" | "connected" | "disconnected";
  joinedAt?: number; // Timestamp when player joined the room (for turn order)
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
  currentPlayerWpm?: number;
  streak?: number;
  roundNumber: number; // Current round number
  winnerId?: string | null;
  winnerName?: string | null;
  frozenTimeLeft?: number | null;
  recentWords?: string[];
}

export interface Room {
  id: string;
  hostId: string;
  type: "public" | "private";
  status: "waiting" | "playing" | "intermission" | "finished";
  createdAt: number;
  code?: string; // Optional for public rooms
  settings: GameSettings;
  players: Record<string, Player>;
  gameState?: GameState;
  intermissionEndsAt?: number | null;
}

// ============================================================
// Phase 5b: Replay System Types
// ============================================================

export type ReplayEventType =
  | 'game_start'
  | 'turn_start'
  | 'turn_end'
  | 'word_spoken'
  | 'word_correct'
  | 'word_incorrect'
  | 'player_eliminated'
  | 'game_end';

export interface ReplayEvent {
  sequence_num: number;
  event_type: ReplayEventType;
  player_id: string | null;
  word: string | null;
  wpm: number | null;
  time_taken_ms: number | null;
  streak: number | null;
  timestamp_ms: number;
  metadata: Record<string, unknown>;
}

export interface GameReplay {
  id: number;
  room_id: string;
  season_id: string | null;
  mode: string;
  is_ranked: boolean;
  started_at: string;
  ended_at: string | null;
  winner_id: string | null;
  total_players: number;
  game_duration_ms: number | null;
  events: ReplayEvent[];
  player_stats: Record<string, PlayerReplayStats>;
  winner_username?: string;
  winner_avatar_url?: string;
}

export interface PlayerReplayStats {
  correct_words: number;
  incorrect_words: number;
  total_wpm: number;
  max_streak: number;
  total_time_ms: number;
  eliminated_at_ms: number | null;
  final_rank: number;
}

export interface ReplayTimelineEvent {
  sequence_num: number;
  event_type: ReplayEventType;
  player_id: string | null;
  player_username: string | null;
  player_avatar_url: string | null;
  word: string | null;
  wpm: number | null;
  time_taken_ms: number | null;
  streak: number | null;
  timestamp_ms: number;
  metadata: Record<string, unknown>;
}

export interface ReplayPlaybackState {
  replay: GameReplay | null;
  timeline: ReplayTimelineEvent[];
  currentEventIndex: number;
  isPlaying: boolean;
  playbackSpeed: number; // 0.5, 1, 2, 4
  currentTimeMs: number;
  totalDurationMs: number;
}

// ============================================================
// Phase 5a: Competitive Integrity Types
// ============================================================

export interface KeystrokeLogEntry {
  id: number;
  room_id: string;
  player_id: string;
  word: string;
  keystrokes: Array<{ char: string; t: number }>;
  submitted_at: string;
  wpm: number;
  word_length: number;
  time_taken_ms: number;
  verified: boolean;
  suspicious: boolean;
  anomaly_score: number;
  anomaly_reasons: string[];
  created_at: string;
  player_username?: string;
  player_avatar_url?: string;
}

export interface KeystrokeLogFilters {
  room_id?: string;
  player_id?: string;
  suspicious_only?: boolean;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface AdminPanelTabs {
  keystrokeLogs: 'keystrokeLogs';
  rankedRatings: 'rankedRatings';
  seasons: 'seasons';
}
