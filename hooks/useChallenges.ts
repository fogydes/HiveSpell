// Phase 4c: Daily/Weekly Challenges - React Hook with Supabase persistence
// Reads and progress updates use direct table queries with RLS (avoids the historical
// 42501 "permission denied for function" errors from when the challenge RPCs lacked
// grants). Claiming goes through the claim_challenge_reward RPC (SECURITY DEFINER,
// granted to authenticated in 20260805000000) so marking-claimed + battle-pass XP +
// nectar happen atomically using the canonical add_battle_pass_xp tier logic.

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
  type ChallengeCategory,
  type ChallengeMetric,
} from '../utils/challenges';

// Raw database response types (snake_case from database)
interface RawChallengeDef {
  id: string;
  type: 'daily' | 'weekly';
  title: string;
  description: string;
  category: string;
  target_value: number;
  target_metric: string;
  reward_xp: number;
  reward_nectar: number;
  reward_cosmetic_id: string | null;
  tier: 'common' | 'rare' | 'epic' | 'legendary';
  is_active: boolean;
}

interface RawPlayerChallenge {
  challenge_id: string;
  user_id: string;
  season_id: string;
  current_progress: number;
  is_completed: boolean;
  is_claimed: boolean;
  completed_at: string | null;
  claimed_at: string | null;
  updated_at: string;
}

// Shapes of the direct-table query results consumed below. These mirror the
// Supabase generated schema (types/database.types.ts) while preserving the
// refined 'daily'|'weekly' and tier unions that RawChallengeDef already encodes
// (the generated challenge_definitions row types those columns only as `string`).
type ChallengeWithProgressRow = RawChallengeDef & {
  player_challenges: Array<
    Pick<RawPlayerChallenge, "challenge_id" | "current_progress" | "is_completed" | "is_claimed">
  >;
};

type ChallengeSummaryRow = {
  type: RawChallengeDef["type"];
  player_challenges: Array<Pick<RawPlayerChallenge, "is_completed" | "is_claimed">>;
};

// Joined query types for complex queries
interface PlayerChallengeWithDef {
  challenge_id: string;
  user_id: string;
  season_id: string;
  current_progress: number;
  is_completed: boolean;
  is_claimed: boolean;
  completed_at: string | null;
  claimed_at: string | null;
  updated_at: string;
  challenge_definitions: {
    target_value: number;
    target_metric: string;
  }
}

// Partial type for Supabase joined query results (only selected fields)
// Note: Supabase returns joined relationships as arrays when using !inner
interface PlayerChallengePartial {
  challenge_id: string;
  current_progress: number;
  is_completed: boolean;
  completed_at: string | null;
  challenge_definitions: Array<{
    target_value: number;
    target_metric: string;
  }>
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

  // Convert raw data to PlayerChallenge with computed fields
  const mapToPlayerChallenge = (challengeDef: RawChallengeDef, playerProgress: Pick<RawPlayerChallenge, "current_progress" | "is_completed" | "is_claimed"> | null): PlayerChallenge => ({
    challengeId: challengeDef.id,
    type: challengeDef.type,
    title: challengeDef.title,
    description: challengeDef.description,
    category: challengeDef.category as ChallengeCategory,
    targetValue: challengeDef.target_value,
    targetMetric: challengeDef.target_metric as ChallengeMetric,
    currentProgress: playerProgress?.current_progress ?? 0,
    isCompleted: playerProgress?.is_completed ?? false,
    isClaimed: playerProgress?.is_claimed ?? false,
    rewardXp: challengeDef.reward_xp,
    rewardNectar: challengeDef.reward_nectar,
    rewardCosmeticId: challengeDef.reward_cosmetic_id || undefined,
    tier: challengeDef.tier,
    progressPercent: getChallengeProgressPercent(playerProgress?.current_progress ?? 0, challengeDef.target_value),
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
      // 1. Ensure challenges exist for this season (replaces ensure_player_challenges RPC)
      // This uses INSERT ... ON CONFLICT DO NOTHING which works with RLS
      const { data: activeChallenges, error: activeError } = await supabase
        .from('challenge_definitions')
        .select('id')
        .eq('is_active', true);

      if (activeError) throw activeError;

      if (activeChallenges && activeChallenges.length > 0) {
        const challengeIds = activeChallenges.map((c) => c.id);

        // Insert missing player_challenges rows
        const { error: insertError } = await supabase
          .from('player_challenges')
          .upsert(
            challengeIds.map((challengeId) => ({
              user_id: userId,
              challenge_id: challengeId,
              season_id: seasonId,
              current_progress: 0,
              is_completed: false,
              is_claimed: false,
            })),
            { onConflict: 'user_id,challenge_id,season_id', ignoreDuplicates: true }
          );

        if (insertError) throw insertError;
      }

      // 2. Fetch challenges with progress (replaces get_player_challenges RPC)
      const { data: challengeData, error: challengeError } = await supabase
        .from('challenge_definitions')
        .select(`
          id,
          type,
          title,
          description,
          category,
          target_value,
          target_metric,
          reward_xp,
          reward_nectar,
          reward_cosmetic_id,
          tier,
          is_active,
          player_challenges!inner (
            challenge_id,
            current_progress,
            is_completed,
            is_claimed
          )
        `)
        .eq('is_active', true)
        .eq('player_challenges.user_id', userId)
        .eq('player_challenges.season_id', seasonId)
        .order('type', { ascending: true }) // daily first
        .order('tier', { ascending: false })
        .order('target_value', { ascending: true });

      if (challengeError) throw challengeError;

      // 3. Fetch summary (replaces get_challenge_summary RPC)
      const { data: summaryData, error: summaryError } = await supabase
        .from('challenge_definitions')
        .select(`
          type,
          player_challenges!inner (
            is_completed,
            is_claimed
          )
        `)
        .eq('is_active', true)
        .eq('player_challenges.user_id', userId)
        .eq('player_challenges.season_id', seasonId);

      if (summaryError) throw summaryError;

      if (mountedRef.current) {
        // Map challenges with progress
        const mappedChallenges = (challengeData || []).map((cd: ChallengeWithProgressRow) => {
          const pc = cd.player_challenges?.[0] || null;
          // Remove the nested player_challenges from the challenge definition
          const { player_challenges, ...def } = cd;
          return mapToPlayerChallenge(def, pc);
        });
        setChallenges(mappedChallenges);

        // Calculate summary from returned data
        if (summaryData && summaryData.length > 0) {
          const dailyTotal = summaryData.filter((c: ChallengeSummaryRow) => c.type === 'daily').length;
          const dailyCompleted = summaryData.filter((c: ChallengeSummaryRow) => c.type === 'daily' && c.player_challenges?.[0]?.is_completed).length;
          const dailyClaimed = summaryData.filter((c: ChallengeSummaryRow) => c.type === 'daily' && c.player_challenges?.[0]?.is_claimed).length;
          const weeklyTotal = summaryData.filter((c: ChallengeSummaryRow) => c.type === 'weekly').length;
          const weeklyCompleted = summaryData.filter((c: ChallengeSummaryRow) => c.type === 'weekly' && c.player_challenges?.[0]?.is_completed).length;
          const weeklyClaimed = summaryData.filter((c: ChallengeSummaryRow) => c.type === 'weekly' && c.player_challenges?.[0]?.is_claimed).length;

          // Calculate reset times
          const now = new Date();
          const dailyReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
          const dayOfWeek = now.getUTCDay();
          const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
          const weeklyReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday, 0, 0, 0));

          setSummary({
            dailyTotal,
            dailyCompleted,
            dailyClaimed,
            weeklyTotal,
            weeklyCompleted,
            weeklyClaimed,
            dailyResetAt: dailyReset.toISOString(),
            weeklyResetAt: weeklyReset.toISOString(),
          });
          setDailyResetAt(dailyReset);
          setWeeklyResetAt(weeklyReset);
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
      // claim_challenge_reward is a SECURITY DEFINER RPC (granted to authenticated in
      // 20260805000000). It validates completion/claim state, then atomically marks the
      // challenge claimed, awards battle-pass XP via add_battle_pass_xp (the canonical
      // tier/XP logic), and credits profile nectar -- all in a single transaction.
      const { data, error: rpcError } = await supabase.rpc('claim_challenge_reward', {
        p_user_id: userId,
        p_season_id: seasonId,
        p_challenge_id: challengeId,
      });

      if (rpcError) throw rpcError;

      // A RETURNS TABLE function surfaces through PostgREST as an array of rows.
      const result = Array.isArray(data) ? data[0] : data;
      if (!result) {
        return { success: false, rewardXp: 0, rewardNectar: 0, message: 'Failed to claim reward' };
      }

      if (result.success) {
        await fetchChallenges();
      }

      return {
        success: !!result.success,
        rewardXp: result.reward_xp ?? 0,
        rewardNectar: result.reward_nectar ?? 0,
        message: result.message ?? '',
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
      // Get active challenges for this user/season that track this metric
      const { data: playerChallenges, error: pcError } = await supabase
        .from('player_challenges')
        .select(`
          challenge_id,
          current_progress,
          is_completed,
          completed_at,
          challenge_definitions!inner (
            target_value,
            target_metric
          )
        `)
        .eq('user_id', userId)
        .eq('season_id', seasonId)
        .eq('challenge_definitions.target_metric', metric)
        .eq('challenge_definitions.is_active', true)
        .eq('is_completed', false);

      if (pcError) throw pcError;

      const results: ProgressUpdateResult[] = [];

      for (const pc of (playerChallenges as PlayerChallengePartial[]) || []) {
        const challenge = pc.challenge_definitions[0];
        const wasCompleted = pc.is_completed;

        let newProgress: number;
        if (metric === 'unique_words' && uniqueWords) {
          // Count unique words
          newProgress = new Set(uniqueWords.filter(w => w)).size;
        } else {
          newProgress = pc.current_progress + increment;
        }

        const nowCompleted = newProgress >= challenge.target_value && !wasCompleted;

        // Update player progress
        const { error: updateError } = await supabase
          .from('player_challenges')
          .update({
            current_progress: Math.min(newProgress, challenge.target_value),
            is_completed: nowCompleted,
            completed_at: nowCompleted ? new Date().toISOString() : pc.completed_at,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('challenge_id', pc.challenge_id)
          .eq('season_id', seasonId);

        if (updateError) throw updateError;

        results.push({
          challengeId: pc.challenge_id,
          currentProgress: Math.min(newProgress, challenge.target_value),
          isCompleted: nowCompleted,
          newlyCompleted: nowCompleted,
        });
      }

      // Special handling for games_played (increment on game start)
      if (metric === 'games_played') {
        const { data: gpChallenges, error: gpError } = await supabase
          .from('player_challenges')
          .select(`
            challenge_id,
            current_progress,
            is_completed,
            completed_at,
            challenge_definitions!inner (
              target_value,
              target_metric
            )
          `)
          .eq('user_id', userId)
          .eq('season_id', seasonId)
          .eq('challenge_definitions.target_metric', 'games_played')
          .eq('challenge_definitions.is_active', true)
          .eq('is_completed', false);

        if (gpError) throw gpError;

        for (const pc of (gpChallenges as PlayerChallengePartial[]) || []) {
          const challenge = pc.challenge_definitions[0];
          const wasCompleted = pc.is_completed;
          const newProgress = pc.current_progress + increment;
          const nowCompleted = newProgress >= challenge.target_value && !wasCompleted;

          const { error: updateError } = await supabase
            .from('player_challenges')
            .update({
              current_progress: Math.min(newProgress, challenge.target_value),
              is_completed: nowCompleted,
              completed_at: nowCompleted ? new Date().toISOString() : pc.completed_at,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('challenge_id', pc.challenge_id)
            .eq('season_id', seasonId);

          if (updateError) throw updateError;

          results.push({
            challengeId: pc.challenge_id,
            currentProgress: Math.min(newProgress, challenge.target_value),
            isCompleted: nowCompleted,
            newlyCompleted: nowCompleted,
          });
        }
      }

      // Special handling for perfect_rounds
      if (perfectRound) {
        const { data: prChallenges, error: prError } = await supabase
          .from('player_challenges')
          .select(`
            challenge_id,
            current_progress,
            is_completed,
            completed_at,
            challenge_definitions!inner (
              target_value,
              target_metric
            )
          `)
          .eq('user_id', userId)
          .eq('season_id', seasonId)
          .eq('challenge_definitions.target_metric', 'perfect_rounds')
          .eq('challenge_definitions.is_active', true)
          .eq('is_completed', false);

        if (prError) throw prError;

        for (const pc of (prChallenges as PlayerChallengePartial[]) || []) {
          const challenge = pc.challenge_definitions[0];
          const wasCompleted = pc.is_completed;
          const newProgress = pc.current_progress + 1;
          const nowCompleted = newProgress >= challenge.target_value && !wasCompleted;

          const { error: updateError } = await supabase
            .from('player_challenges')
            .update({
              current_progress: Math.min(newProgress, challenge.target_value),
              is_completed: nowCompleted,
              completed_at: nowCompleted ? new Date().toISOString() : pc.completed_at,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('challenge_id', pc.challenge_id)
            .eq('season_id', seasonId);

          if (updateError) throw updateError;

          results.push({
            challengeId: pc.challenge_id,
            currentProgress: Math.min(newProgress, challenge.target_value),
            isCompleted: nowCompleted,
            newlyCompleted: nowCompleted,
          });
        }
      }

      // Refresh if any newly completed
      const hasNewlyCompleted = results.some((r) => r.newlyCompleted);
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
    // For streak, we set absolute value by "incrementing" to the new value
    // Since updateProgress adds by default, we'd need to calculate delta
    // For now, we call with the metric and let it handle appropriately
    await updateProgress('streak_count', 0); // This will be handled specially
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
      await updateProgress('games_played', 0, undefined, true, false);
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