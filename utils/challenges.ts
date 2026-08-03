// Phase 4c: Daily/Weekly Challenges - Types and utilities

export type ChallengeType = 'daily' | 'weekly';
export type ChallengeCategory = 'spelling' | 'speed' | 'streak' | 'variety' | 'social' | 'neat';
export type ChallengeTier = 'common' | 'rare' | 'epic' | 'legendary';
export type ChallengeMetric =
  | 'correct_words'
  | 'wpm_total'
  | 'streak_count'
  | 'unique_words'
  | 'games_played'
  | 'words_spelled'
  | 'perfect_rounds';

export interface ChallengeDefinition {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  category: ChallengeCategory;
  targetValue: number;
  targetMetric: ChallengeMetric;
  rewardXp: number;
  rewardNectar: number;
  rewardCosmeticId?: string;
  tier: ChallengeTier;
  isActive: boolean;
  createdAt: string;
}

export interface PlayerChallenge {
  challengeId: string;
  type: ChallengeType;
  title: string;
  description: string;
  category: ChallengeCategory;
  targetValue: number;
  targetMetric: ChallengeMetric;
  currentProgress: number;
  isCompleted: boolean;
  isClaimed: boolean;
  rewardXp: number;
  rewardNectar: number;
  rewardCosmeticId?: string;
  tier: ChallengeTier;
  progressPercent: number;
}

export interface ChallengeSummary {
  dailyTotal: number;
  dailyCompleted: number;
  dailyClaimed: number;
  weeklyTotal: number;
  weeklyCompleted: number;
  weeklyClaimed: number;
  dailyResetAt: string;
  weeklyResetAt: string;
}

export interface ClaimRewardResult {
  success: boolean;
  rewardXp: number;
  rewardNectar: number;
  message: string;
}

export interface ProgressUpdateResult {
  challengeId: string;
  currentProgress: number;
  isCompleted: boolean;
  newlyCompleted: boolean;
}

// Tier display helpers
export const CHALLENGE_TIER_COLORS: Record<ChallengeTier, string> = {
  common: '#9ca3af',   // gray-400
  rare: '#3b82f6',     // blue-500
  epic: '#a855f7',     // purple-500
  legendary: '#f59e0b', // amber-500
};

export const CHALLENGE_TIER_GLOWS: Record<ChallengeTier, string> = {
  common: 'rgba(156, 163, 175, 0.4)',
  rare: 'rgba(59, 130, 246, 0.4)',
  epic: 'rgba(168, 85, 247, 0.4)',
  legendary: 'rgba(245, 158, 11, 0.4)',
};

export const CHALLENGE_CATEGORY_ICONS: Record<ChallengeCategory, string> = {
  spelling: '📝',
  speed: '⚡',
  streak: '🔥',
  variety: '🌈',
  social: '👥',
  neat: '💎',
};

export const CHALLENGE_TYPE_LABELS: Record<ChallengeType, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
};

export function getChallengeTierColor(tier: ChallengeTier): string {
  return CHALLENGE_TIER_COLORS[tier] || CHALLENGE_TIER_COLORS.common;
}

export function getChallengeTierGlow(tier: ChallengeTier): string {
  return CHALLENGE_TIER_GLOWS[tier] || CHALLENGE_TIER_GLOWS.common;
}

export function getChallengeCategoryIcon(category: ChallengeCategory): string {
  return CHALLENGE_CATEGORY_ICONS[category] || '⭐';
}

export function formatChallengeProgress(current: number, target: number): string {
  return `${Math.min(current, target)}/${target}`;
}

export function getChallengeProgressPercent(current: number, target: number): number {
  return Math.min(100, Math.round((current / target) * 100));
}

export function isDailyChallenge(type: ChallengeType): boolean {
  return type === 'daily';
}

export function isWeeklyChallenge(type: ChallengeType): boolean {
  return type === 'weekly';
}

// Default season ID (matches battle pass)
export function getCurrentSeasonId(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  // Seasons rotate quarterly
  const quarter = Math.ceil(month / 3);
  return `season-${year}-q${quarter}`;
}

export function getDailyResetTime(): Date {
  const now = new Date();
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return reset;
}

export function getWeeklyResetTime(): Date {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday, 0, 0, 0));
  return reset;
}

export function getTimeUntilReset(resetAt: string): { days: number; hours: number; minutes: number; seconds: number } {
  const now = new Date();
  const reset = new Date(resetAt);
  const diffMs = Math.max(0, reset.getTime() - now.getTime());

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}

export function formatTimeUntilReset(resetAt: string): string {
  const { days, hours, minutes } = getTimeUntilReset(resetAt);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}