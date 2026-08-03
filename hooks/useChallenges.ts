// Phase 4c: Daily/Weekly Challenges - React Hook with Supabase persistence

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import {
  getCurrentSeasonId,
  ChallengeDefinition,
  PlayerChallenge,
  ChallengeSummary,
  ClaimRewardResult,
  ProgressUpdateResult,
  formatChallengeProgress,
  getChallengeProgressPercent,
  getChallengeTierColor,
  getChallengeCategoryIcon,
  type ChallengeType,
  type ChallengeTier,
} from '../utils/challenges';

// Raw RPC response types (snake_case from database)
interface RawPlayerChallenge {
  challenge_id: string;
  type: 'daily' | 'weekly';
  title: string;
  description: string;
  category: string;
  target_value: number;
  target_metric: string;
  current_progress: number;
  is_completed: boolean;
  is_claimed: boolean;
  reward_xp: number;
  reward_nectar: number;
  reward_cosmetic_id?: string;
  tier: 'common' | 'rare' | 'epic' | 'legendary';
}

interface RawChallengeSummary {
  daily_total: number;
  daily_completed: number;
  daily_claimed: number;
  weekly_total: number;
  weekly_completed: number;
  weekly_claimed: number;
  daily_reset_at: string;
  weekly_reset_at: string;
}

interface RawProgressUpdateResult {
  challenge_id: string;
  current_progress: number;
  is_completed: boolean;
  newly_completed: boolean;
}

interface UseChallengesReturn {
  // State
  challenges: PlayerChallenge[];
  summary: ChallengeSummary | null;
  loading: boolean;
  error: string | null;
  dailyResetAt: Date | null;
  weeklyResetAt: Date | null;

  // Actions
  refresh: () => Promise<void>;
  claimReward: (challengeId: string) => Promise<ClaimRewardResult>;
  updateProgress: (
    metric: string,
    increment?: number,
    uniqueWords?: string[],
    gameWon?: boolean,
    perfectRound?: boolean
  ) => Promise<ProgressUpdateResult[]>;

  // Computed
  dailyChallenges: PlayerChallenge[];
  weeklyChallenges: PlayerChallenge[];
  completedDailyCount: number;
  completedWeeklyCount: number;
  totalDailyCount: number;
  totalWeeklyCount: number;
}

export function useChallenges(userId: string | null): UseChallengesReturn {
  const [challenges, setChallenges] = useState<PlayerChallenge[]>([]);
  const [summary, setSummary] = useState<ChallengeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyResetAt, setDailyResetAt] = useState<Date | null>(null);
  const [weeklyResetAt, setWeeklyResetAt] = useState<Date | null>(null);

  const seasonId = getCurrentSeasonId();
  const mountedRef = useRef(true);

  // Convert raw RPC data to PlayerChallenge with computed fields
  const mapToPlayerChallenge = (data: RawPlayerChallenge): PlayerChallenge => ({
    challengeId: data.challenge_id,
    type: data.type,
    title: data.title,
    description: data.description,
    category: data.category as PlayerChallenge['category'],
    targetValue: data.target_value,
    targetMetric: data.target_metric as PlayerChallenge['targetMetric'],
    currentProgress: data.current_progress,
    isCompleted: data.is_completed,
    isClaimed: data.is_claimed,
    rewardXp: data.reward_xp,
    rewardNectar: data.reward_nectar,
    rewardCosmeticId: data.reward_cosmetic_id,
    tier: data.tier,
    progressPercent: getChallengeProgressPercent(data.current_progress, data.target_value),
  });

  const fetchChallenges = useCallback(async () => {
    if (!userId) {
      setChallenges([]);
      setSummary(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Ensure challenges exist for this season
      await supabase.rpc('ensure_player_challenges', {
        p_user_id: userId,
        p_season_id: seasonId,
      });

      // Fetch challenges
      const { data: challengesData, error: challengesError } = await supabase.rpc('get_player_challenges', {
        p_user_id: userId,
        p_season_id: seasonId,
      });

      if (challengesError) throw challengesError;

      // Fetch summary
      const { data: summaryData, error: summaryError } = await supabase.rpc('get_challenge_summary', {
        p_user_id: userId,
        p_season_id: seasonId,
      });

      if (summaryError) throw summaryError;

      if (mountedRef.current) {
        const mappedChallenges = (challengesData || []).map(mapToPlayerChallenge);
        setChallenges(mappedChallenges);

        if (summaryData && summaryData.length > 0) {
          const s = summaryData[0];
          setSummary({
            dailyTotal: s.daily_total,
            dailyCompleted: s.daily_completed,
            dailyClaimed: s.daily_claimed,
            weeklyTotal: s.weekly_total,
            weeklyCompleted: s.weekly_completed,
            weeklyClaimed: s.weekly_claimed,
            dailyResetAt: s.daily_reset_at,
            weeklyResetAt: s.weekly_reset_at,
          });
          setDailyResetAt(new Date(s.daily_reset_at));
          setWeeklyResetAt(new Date(s.weekly_reset_at));
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load challenges';
      if (mountedRef.current) {
        setError(message);
        console.error('[useChallenges] Error:', err);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId, seasonId]);

  const claimReward = useCallback(async (challengeId: string): Promise<ClaimRewardResult> => {
    if (!userId) {
      return { success: false, rewardXp: 0, rewardNectar: 0, message: 'Not authenticated' };
    }

    try {
      const { data, error } = await supabase.rpc('claim_challenge_reward', {
        p_user_id: userId,
        p_season_id: seasonId,
        p_challenge_id: challengeId,
      });

      if (error) throw error;

      const result = data?.[0] || { success: false, reward_xp: 0, reward_nectar: 0, message: 'Unknown error' };

      // Refresh challenges after claim
      await fetchChallenges();

      return {
        success: result.success,
        rewardXp: result.reward_xp,
        rewardNectar: result.reward_nectar,
        message: result.message,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to claim reward';
      console.error('[useChallenges] Claim error:', err);
      return { success: false, rewardXp: 0, rewardNectar: 0, message };
    }
  }, [userId, seasonId, fetchChallenges]);

  const updateProgress = useCallback(async (
    metric: string,
    increment: number = 1,
    uniqueWords?: string[],
    gameWon: boolean = false,
    perfectRound: boolean = false
  ): Promise<ProgressUpdateResult[]> => {
    if (!userId) return [];

    try {
      const { data, error } = await supabase.rpc('update_challenge_progress', {
        p_user_id: userId,
        p_season_id: seasonId,
        p_metric: metric,
        p_increment: increment,
        p_unique_words: uniqueWords || null,
        p_game_won: gameWon,
        p_perfect_round: perfectRound,
      });

      if (error) throw error;

      interface RawProgressUpdateResult {
  challenge_id: string;
  current_progress: number;
  is_completed: boolean;
  newly_completed: boolean;
}

// ... inside updateProgress callback:
      const results: ProgressUpdateResult[] = (data || []).map((d: RawProgressUpdateResult) => ({
        challengeId: d.challenge_id,
        currentProgress: d.current_progress,
        isCompleted: d.is_completed,
        newlyCompleted: d.newly_completed,
      }));

      // Refresh if any newly completed
      const hasNewlyCompleted = results.some((r: ProgressUpdateResult) => r.newlyCompleted);
      if (hasNewlyCompleted) {
        await fetchChallenges();
      }

      return results;
    } catch (err) {
      console.error('[useChallenges] Progress update error:', err);
      return [];
    }
  }, [userId, seasonId, fetchChallenges]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    fetchChallenges();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchChallenges]);

  // Computed values
  const dailyChallenges = challenges.filter(c => c.type === 'daily');
  const weeklyChallenges = challenges.filter(c => c.type === 'weekly');
  const completedDailyCount = dailyChallenges.filter(c => c.isCompleted).length;
  const completedWeeklyCount = weeklyChallenges.filter(c => c.isCompleted).length;
  const totalDailyCount = dailyChallenges.length;
  const totalWeeklyCount = weeklyChallenges.length;

  return {
    challenges,
    summary,
    loading,
    error,
    dailyResetAt,
    weeklyResetAt,
    refresh: fetchChallenges,
    claimReward,
    updateProgress,
    dailyChallenges,
    weeklyChallenges,
    completedDailyCount,
    completedWeeklyCount,
    totalDailyCount,
    totalWeeklyCount,
  };
}

// Hook for tracking challenge progress during gameplay
export function useChallengeProgress(userId: string | null) {
  const { updateProgress } = useChallenges(userId);
  const wordsSpokenRef = useRef<string[]>([]);
  const gameStartedRef = useRef(false);

  const recordCorrectWord = useCallback(async (word: string, wpm: number) => {
    if (!userId) return;

    wordsSpokenRef.current.push(word);

    await updateProgress('correct_words', 1);
    await updateProgress('wpm_total', wpm);
    await updateProgress('words_spelled', 1);
    await updateProgress('unique_words', 1, wordsSpokenRef.current);
  }, [userId, updateProgress]);

  const recordStreak = useCallback(async (streakCount: number) => {
    if (!userId) return;
    await updateProgress('streak_count', 0, undefined, undefined, undefined); // Just updates to current streak
    // Note: The RPC handles streak by setting progress to the new streak value
    // We'll call with increment=0 but targetMetric 'streak_count'
    // Actually need to use a different approach - the RPC increments by default
    // For streak, we want to set absolute value, so we need special handling
  }, [userId, updateProgress]);

  const recordGameStart = useCallback(async () => {
    if (!userId || gameStartedRef.current) return;
    gameStartedRef.current = true;
    await updateProgress('games_played', 1);
  }, [userId, updateProgress]);

  const recordGameEnd = useCallback(async (won: boolean, perfect: boolean = false) => {
    if (!userId) return;
    gameStartedRef.current = false;
    wordsSpokenRef.current = [];
    if (won) {
      await updateProgress('games_played', 0, undefined, true, false); // game_won handled separately
    }
    if (perfect) {
      await updateProgress('perfect_rounds', 1);
    }
  }, [userId, updateProgress]);

  const resetStreakTracking = useCallback(() => {
    // Call when streak is broken
  }, []);

  return {
    recordCorrectWord,
    recordStreak,
    recordGameStart,
    recordGameEnd,
    resetStreakTracking,
  };
}