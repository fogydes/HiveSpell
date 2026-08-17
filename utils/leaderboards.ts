// Phase 4d: Multi-dimension Leaderboards - Type Definitions
// Global, Friends, Daily, Mode-specific leaderboards with pagination and realtime support

// import { type SeasonId } from './challenges'; // Unused for now

// ============================================================
// Leaderboard Categories
// ============================================================

export type LeaderboardType = 'global' | 'friends' | 'daily' | 'mode';

export type GameMode = 'baby' | 'cakewalk' | 'learner' | 'intermediate' | 'heated' | 'genius' | 'polymath' | 'omniscient';

export const GAME_MODES: GameMode[] = ['baby', 'cakewalk', 'learner', 'intermediate', 'heated', 'genius', 'polymath', 'omniscient'];

export const GAME_MODE_LABELS: Record<GameMode, string> = {
  baby: 'Baby Bee',
  cakewalk: 'Cakewalk',
  learner: 'Learner',
  intermediate: 'Intermediate',
  heated: 'Heated',
  genius: 'Genius',
  polymath: 'Polymath',
  omniscient: 'Omniscient',
};

export const GAME_MODE_TIERS: Record<GameMode, number> = {
  baby: 1,
  cakewalk: 2,
  learner: 3,
  intermediate: 4,
  heated: 5,
  genius: 6,
  polymath: 7,
  omniscient: 8,
};

// ============================================================
// Leaderboard Entry Types
// ============================================================

export interface BaseLeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl: string | null;
  tier: string;
  isCurrentUser: boolean;
  rank: number;
}

export interface GlobalLeaderboardEntry extends BaseLeaderboardEntry {
  type: 'global';
  compositeScore: number;
  gamesWon: number;
  totalCorrectWords: number;
  lifetimeNectar: number;
  maxStreak: number;
  gamesPlayed: number;
  globalRank: number;
}

export interface FriendsLeaderboardEntry extends BaseLeaderboardEntry {
  type: 'friends';
  compositeScore: number;
  gamesWon: number;
  totalCorrectWords: number;
  lifetimeNectar: number;
  maxStreak: number;
  gamesPlayed: number;
  friendGroup: string;
  friendRank: number;
}

export interface DailyLeaderboardEntry extends BaseLeaderboardEntry {
  type: 'daily';
  dailyWins: number;
  dailyCorrectWords: number;
  dailyXp: number;
  leaderboardDate: string; // ISO date string
}

export interface ModeLeaderboardEntry extends BaseLeaderboardEntry {
  type: 'mode';
  mode: GameMode;
  gamesPlayed: number;
  gamesWon: number;
  totalCorrectWords: number;
  bestWpm: number;
  maxStreak: number;
  modeScore: number;
  modeRank: number;
}

export type LeaderboardEntry =
  | GlobalLeaderboardEntry
  | FriendsLeaderboardEntry
  | DailyLeaderboardEntry
  | ModeLeaderboardEntry;

// ============================================================
// Leaderboard Response Types
// ============================================================

export interface LeaderboardPage<T extends LeaderboardEntry> {
  entries: T[];
  page: number;
  pageSize: number;
  totalEntries: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PlayerRankInfo {
  leaderboardType: LeaderboardType;
  rank: number;
  totalPlayers: number;
  score: number;
  metadata: Record<string, any>;
}

// ============================================================
// Tier System (reused from battle pass / profile)
// ============================================================

export type LeaderboardTier =
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Platinum'
  | 'Diamond'
  | 'Queen';

export const TIER_ORDER: LeaderboardTier[] = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Queen'];

export const TIER_COLORS: Record<LeaderboardTier, string> = {
  Bronze: '#CD7F32',
  Silver: '#C0C0C0',
  Gold: '#FFD700',
  Platinum: '#E5E4E2',
  Diamond: '#B9F2FF',
  Queen: '#FF00FF',
};

export const TIER_GLOWS: Record<LeaderboardTier, string> = {
  Bronze: '#CD7F32',
  Silver: '#C0C0C0',
  Gold: '#FFD700',
  Platinum: '#E5E4E2',
  Diamond: '#B9F2FF',
  Queen: '#FF00FF',
};

export function getTierFromScore(score: number): LeaderboardTier {
  // Score thresholds for tier assignment
  if (score >= 50000) return 'Queen';
  if (score >= 25000) return 'Diamond';
  if (score >= 10000) return 'Platinum';
  if (score >= 5000) return 'Gold';
  if (score >= 1000) return 'Silver';
  return 'Bronze';
}

export function getTierColor(tier: string): string {
  return TIER_COLORS[tier as LeaderboardTier] || '#64748b';
}

export function getTierGlow(tier: string): string {
  return TIER_GLOWS[tier as LeaderboardTier] || '#64748b';
}

// ============================================================
// Helper Functions
// ============================================================

export function formatRank(rank: number): string {
  if (rank <= 0) return '—';
  if (rank === 1) return '🥇 #1';
  if (rank === 2) return '🥈 #2';
  if (rank === 3) return '🥉 #3';
  return `#${rank.toLocaleString()}`;
}

export function formatScore(score: number): string {
  if (score >= 1000000) return `${(score / 1000000).toFixed(1)}M`;
  if (score >= 1000) return `${(score / 1000).toFixed(1)}K`;
  return score.toLocaleString();
}

export function formatWpm(wpm: number): string {
  return `${wpm} WPM`;
}

export function getModeLabel(mode: GameMode): string {
  return GAME_MODE_LABELS[mode] || mode;
}

export function getModeTier(mode: GameMode): number {
  return GAME_MODE_TIERS[mode] || 1;
}

export function isTopThree(rank: number): boolean {
  return rank > 0 && rank <= 3;
}

export function getRankEmoji(rank: number): string {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return '';
  }
}

// ============================================================
// Leaderboard Config
// ============================================================

export const LEADERBOARD_PAGE_SIZE = 25;
export const LEADERBOARD_MAX_PAGES = 100; // Cap for performance

export interface LeaderboardTabConfig {
  id: LeaderboardType;
  label: string;
  icon: string;
  requiresAuth: boolean;
  requiresMode?: boolean;
}

export const LEADERBOARD_TABS: LeaderboardTabConfig[] = [
  { id: 'global', label: 'Global', icon: '🌍', requiresAuth: false },
  { id: 'friends', label: 'Friends', icon: '👥', requiresAuth: true },
  { id: 'daily', label: 'Daily', icon: '☀️', requiresAuth: false },
  { id: 'mode', label: 'By Mode', icon: '🎮', requiresAuth: false, requiresMode: true },
];

// ============================================================
// RPC Response Types (match Supabase function signatures)
// ============================================================

export interface GetGlobalLeaderboardResponse {
  user_id: string;
  username: string;
  avatar_url: string | null;
  tier: string;
  composite_score: number;
  global_rank: number;
  is_current_user: boolean;
  games_won: number;
  total_correct_words: number;
  lifetime_nectar: number;
  max_streak: number;
  games_played: number;
}

export interface GetFriendsLeaderboardResponse {
  user_id: string;
  username: string;
  avatar_url: string | null;
  tier: string;
  composite_score: number;
  friend_rank: number;
  is_current_user: boolean;
  friend_group: string;
  games_won: number;
  total_correct_words: number;
  lifetime_nectar: number;
  max_streak: number;
  games_played: number;
}

export interface GetDailyLeaderboardResponse {
  user_id: string;
  username: string;
  avatar_url: string | null;
  tier: string;
  daily_wins: number;
  daily_correct: number;
  daily_xp: number;
  daily_rank: number;
  is_current_user: boolean;
  leaderboard_date: string;
}

export interface GetModeLeaderboardResponse {
  user_id: string;
  username: string;
  avatar_url: string | null;
  tier: string;
  games_played: number;
  games_won: number;
  total_correct_words: number;
  best_wpm: number;
  max_streak: number;
  mode_score: number;
  mode_rank: number;
  is_current_user: boolean;
  mode: string;
}

export interface GetPlayerRankResponse {
  leaderboard_type: string;
  rank: number;
  total_players: number;
  score: number;
  metadata: Record<string, any>;
}

// ============================================================
// Mapping Functions
// ============================================================

export function mapGlobalLeaderboardResponse(
  data: GetGlobalLeaderboardResponse
): GlobalLeaderboardEntry {
  return {
    type: 'global',
    userId: data.user_id,
    username: data.username,
    avatarUrl: data.avatar_url,
    tier: data.tier,
    compositeScore: Number(data.composite_score),
    globalRank: data.global_rank,
    gamesWon: data.games_won,
    totalCorrectWords: data.total_correct_words,
    lifetimeNectar: Number(data.lifetime_nectar),
    maxStreak: data.max_streak,
    gamesPlayed: data.games_played,
    rank: data.global_rank,
    isCurrentUser: data.is_current_user,
  };
}

export function mapFriendsLeaderboardResponse(
  data: GetFriendsLeaderboardResponse
): FriendsLeaderboardEntry {
  return {
    type: 'friends',
    userId: data.user_id,
    username: data.username,
    avatarUrl: data.avatar_url,
    tier: data.tier,
    compositeScore: Number(data.composite_score),
    friendRank: data.friend_rank,
    gamesWon: data.games_won,
    totalCorrectWords: data.total_correct_words,
    lifetimeNectar: Number(data.lifetime_nectar),
    maxStreak: data.max_streak,
    gamesPlayed: data.games_played,
    rank: data.friend_rank,
    isCurrentUser: data.is_current_user,
    friendGroup: data.friend_group,
  };
}

export function mapDailyLeaderboardResponse(
  data: GetDailyLeaderboardResponse
): DailyLeaderboardEntry {
  return {
    type: 'daily',
    userId: data.user_id,
    username: data.username,
    avatarUrl: data.avatar_url,
    tier: data.tier,
    dailyWins: data.daily_wins,
    dailyCorrectWords: data.daily_correct,
    dailyXp: data.daily_xp,
    leaderboardDate: data.leaderboard_date,
    rank: data.daily_rank,
    isCurrentUser: data.is_current_user,
  };
}

export function mapModeLeaderboardResponse(
  data: GetModeLeaderboardResponse
): ModeLeaderboardEntry {
  return {
    type: 'mode',
    userId: data.user_id,
    username: data.username,
    avatarUrl: data.avatar_url,
    tier: data.tier,
    mode: data.mode as GameMode,
    gamesPlayed: data.games_played,
    gamesWon: data.games_won,
    totalCorrectWords: data.total_correct_words,
    bestWpm: data.best_wpm,
    maxStreak: data.max_streak,
    modeScore: data.mode_score,
    modeRank: data.mode_rank,
    rank: data.mode_rank,
    isCurrentUser: data.is_current_user,
  };
}

export function mapPlayerRankResponse(
  data: GetPlayerRankResponse
): PlayerRankInfo {
  return {
    leaderboardType: data.leaderboard_type as LeaderboardType,
    rank: data.rank,
    totalPlayers: data.total_players,
    score: data.score,
    metadata: data.metadata || {},
  };
}