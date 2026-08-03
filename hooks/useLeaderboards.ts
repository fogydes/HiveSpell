// Phase 4d: Multi-dimension Leaderboards - React Hook with Supabase persistence

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import {
  LeaderboardEntry,
  GlobalLeaderboardEntry,
  FriendsLeaderboardEntry,
  DailyLeaderboardEntry,
  ModeLeaderboardEntry,
  LeaderboardPage,
  PlayerRankInfo,
  LeaderboardType,
  GameMode,
  LEADERBOARD_PAGE_SIZE,
  mapGlobalLeaderboardResponse,
  mapFriendsLeaderboardResponse,
  mapDailyLeaderboardResponse,
  mapModeLeaderboardResponse,
  mapPlayerRankResponse,
  GetGlobalLeaderboardResponse,
  GetFriendsLeaderboardResponse,
  GetDailyLeaderboardResponse,
  GetModeLeaderboardResponse,
  GetPlayerRankResponse,
} from '../utils/leaderboards';

interface UseLeaderboardsReturn {
  // State
  globalLeaderboard: LeaderboardPage<GlobalLeaderboardEntry> | null;
  friendsLeaderboard: LeaderboardPage<FriendsLeaderboardEntry> | null;
  dailyLeaderboard: LeaderboardPage<DailyLeaderboardEntry> | null;
  modeLeaderboard: LeaderboardPage<ModeLeaderboardEntry> | null;
  playerRanks: PlayerRankInfo[];
  loading: boolean;
  error: string | null;
  currentMode: GameMode | null;

  // Pagination state
  globalPage: number;
  friendsPage: number;
  dailyPage: number;
  modePage: number;

  // Actions
  refreshGlobal: (resetPage?: boolean) => Promise<void>;
  refreshFriends: (resetPage?: boolean) => Promise<void>;
  refreshDaily: (resetPage?: boolean) => Promise<void>;
  refreshMode: (mode: GameMode, resetPage?: boolean) => Promise<void>;
  loadMoreGlobal: () => Promise<void>;
  loadMoreFriends: () => Promise<void>;
  loadMoreDaily: () => Promise<void>;
  loadMoreMode: () => Promise<void>;
  setCurrentMode: (mode: GameMode) => void;
  refreshAll: () => Promise<void>;
  fetchPlayerRanks: () => Promise<void>;
}

export function useLeaderboards(userId: string | null): UseLeaderboardsReturn {
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardPage<GlobalLeaderboardEntry> | null>(null);
  const [friendsLeaderboard, setFriendsLeaderboard] = useState<LeaderboardPage<FriendsLeaderboardEntry> | null>(null);
  const [dailyLeaderboard, setDailyLeaderboard] = useState<LeaderboardPage<DailyLeaderboardEntry> | null>(null);
  const [modeLeaderboard, setModeLeaderboard] = useState<LeaderboardPage<ModeLeaderboardEntry> | null>(null);
  const [playerRanks, setPlayerRanks] = useState<PlayerRankInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<GameMode | null>('medium');

  const [globalPage, setGlobalPage] = useState(0);
  const [friendsPage, setFriendsPage] = useState(0);
  const [dailyPage, setDailyPage] = useState(0);
  const [modePage, setModePage] = useState(0);

  const mountedRef = useRef(true);
  const loadingRef = useRef(false);

  const createEmptyPage = <T extends LeaderboardEntry>(): LeaderboardPage<T> => ({
    entries: [],
    page: 0,
    pageSize: LEADERBOARD_PAGE_SIZE,
    totalEntries: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // Global Leaderboard
  const refreshGlobal = useCallback(async (resetPage = true) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      const page = resetPage ? 0 : globalPage;
      const offset = page * LEADERBOARD_PAGE_SIZE;

      const { data, error: rpcError } = await supabase.rpc('get_global_leaderboard', {
        p_viewer_id: userId || '00000000-0000-0000-0000-000000000000',
        p_limit: LEADERBOARD_PAGE_SIZE,
        p_offset: offset,
      });

      if (rpcError) throw rpcError;

      if (mountedRef.current) {
        const entries = (data || []).map(mapGlobalLeaderboardResponse);
        const totalEntries = entries.length > 0 ? entries[0].globalRank + offset : 0;
        const totalPages = Math.ceil(totalEntries / LEADERBOARD_PAGE_SIZE);

        setGlobalLeaderboard({
          entries,
          page,
          pageSize: LEADERBOARD_PAGE_SIZE,
          totalEntries,
          totalPages,
          hasNextPage: page < totalPages - 1,
          hasPreviousPage: page > 0,
        });

        if (resetPage) setGlobalPage(0);
      }
    } catch (err) {
      console.error('[useLeaderboards] Global refresh error:', err);
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load global leaderboard');
      }
    } finally {
      loadingRef.current = false;
    }
  }, [userId, globalPage]);

  // Friends Leaderboard
  const refreshFriends = useCallback(async (resetPage = true) => {
    if (!userId || loadingRef.current) return;
    loadingRef.current = true;

    try {
      const page = resetPage ? 0 : friendsPage;
      const offset = page * LEADERBOARD_PAGE_SIZE;

      const { data, error: rpcError } = await supabase.rpc('get_friends_leaderboard', {
        p_viewer_id: userId,
        p_limit: LEADERBOARD_PAGE_SIZE,
        p_offset: offset,
      });

      if (rpcError) throw rpcError;

      if (mountedRef.current) {
        const entries = (data || []).map(mapFriendsLeaderboardResponse);
        const totalEntries = entries.length > 0 ? entries[0].compositeScore + offset : 0;
        const totalPages = Math.ceil(totalEntries / LEADERBOARD_PAGE_SIZE);

        setFriendsLeaderboard({
          entries,
          page,
          pageSize: LEADERBOARD_PAGE_SIZE,
          totalEntries,
          totalPages,
          hasNextPage: page < totalPages - 1,
          hasPreviousPage: page > 0,
        });

        if (resetPage) setFriendsPage(0);
      }
    } catch (err) {
      console.error('[useLeaderboards] Friends refresh error:', err);
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load friends leaderboard');
      }
    } finally {
      loadingRef.current = false;
    }
  }, [userId, friendsPage]);

  // Daily Leaderboard
  const refreshDaily = useCallback(async (resetPage = true) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      const page = resetPage ? 0 : dailyPage;
      const offset = page * LEADERBOARD_PAGE_SIZE;

      const { data, error: rpcError } = await supabase.rpc('get_daily_leaderboard', {
        p_viewer_id: userId || '00000000-0000-0000-0000-000000000000',
        p_limit: LEADERBOARD_PAGE_SIZE,
        p_offset: offset,
      });

      if (rpcError) throw rpcError;

      if (mountedRef.current) {
        const entries = (data || []).map(mapDailyLeaderboardResponse);
        const totalEntries = entries.length > 0 ? entries[0].dailyRank + offset : 0;
        const totalPages = Math.ceil(totalEntries / LEADERBOARD_PAGE_SIZE);

        setDailyLeaderboard({
          entries,
          page,
          pageSize: LEADERBOARD_PAGE_SIZE,
          totalEntries,
          totalPages,
          hasNextPage: page < totalPages - 1,
          hasPreviousPage: page > 0,
        });

        if (resetPage) setDailyPage(0);
      }
    } catch (err) {
      console.error('[useLeaderboards] Daily refresh error:', err);
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load daily leaderboard');
      }
    } finally {
      loadingRef.current = false;
    }
  }, [userId, dailyPage]);

  // Mode Leaderboard
  const refreshMode = useCallback(async (mode: GameMode, resetPage = true) => {
    if (!mode || loadingRef.current) return;
    loadingRef.current = true;

    try {
      const page = resetPage ? 0 : modePage;
      const offset = page * LEADERBOARD_PAGE_SIZE;

      const { data, error: rpcError } = await supabase.rpc('get_mode_leaderboard', {
        p_viewer_id: userId || '00000000-0000-0000-0000-000000000000',
        p_mode: mode,
        p_limit: LEADERBOARD_PAGE_SIZE,
        p_offset: offset,
      });

      if (rpcError) throw rpcError;

      if (mountedRef.current) {
        const entries = (data || []).map(mapModeLeaderboardResponse);
        const totalEntries = entries.length > 0 ? entries[0].modeRank + offset : 0;
        const totalPages = Math.ceil(totalEntries / LEADERBOARD_PAGE_SIZE);

        setModeLeaderboard({
          entries,
          page,
          pageSize: LEADERBOARD_PAGE_SIZE,
          totalEntries,
          totalPages,
          hasNextPage: page < totalPages - 1,
          hasPreviousPage: page > 0,
        });

        if (resetPage) setModePage(0);
        setCurrentMode(mode);
      }
    } catch (err) {
      console.error('[useLeaderboards] Mode refresh error:', err);
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load mode leaderboard');
      }
    } finally {
      loadingRef.current = false;
    }
  }, [userId, modePage]);

  // Load more pages
  const loadMoreGlobal = useCallback(async () => {
    if (!globalLeaderboard?.hasNextPage) return;
    await refreshGlobal(false);
    setGlobalPage((p) => p + 1);
  }, [globalLeaderboard, refreshGlobal]);

  const loadMoreFriends = useCallback(async () => {
    if (!friendsLeaderboard?.hasNextPage) return;
    await refreshFriends(false);
    setFriendsPage((p) => p + 1);
  }, [friendsLeaderboard, refreshFriends]);

  const loadMoreDaily = useCallback(async () => {
    if (!dailyLeaderboard?.hasNextPage) return;
    await refreshDaily(false);
    setDailyPage((p) => p + 1);
  }, [dailyLeaderboard, refreshDaily]);

  const loadMoreMode = useCallback(async () => {
    if (!modeLeaderboard?.hasNextPage || !currentMode) return;
    await refreshMode(currentMode, false);
    setModePage((p) => p + 1);
  }, [modeLeaderboard, currentMode, refreshMode]);

  // Player ranks
  const fetchPlayerRanks = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error: rpcError } = await supabase.rpc('get_player_rank', {
        p_user_id: userId,
      });

      if (rpcError) throw rpcError;

      if (mountedRef.current && data) {
        setPlayerRanks(data.map(mapPlayerRankResponse));
      }
    } catch (err) {
      console.error('[useLeaderboards] Player ranks error:', err);
    }
  }, [userId]);

  // Refresh all
  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    await Promise.all([
      refreshGlobal(true),
      userId ? refreshFriends(true) : Promise.resolve(),
      refreshDaily(true),
      currentMode ? refreshMode(currentMode, true) : Promise.resolve(),
      userId ? fetchPlayerRanks() : Promise.resolve(),
    ]);

    if (mountedRef.current) {
      setLoading(false);
    }
  }, [userId, currentMode, refreshGlobal, refreshFriends, refreshDaily, refreshMode, fetchPlayerRanks]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    refreshAll();

    return () => {
      mountedRef.current = false;
    };
  }, [refreshAll]);

  return {
    globalLeaderboard,
    friendsLeaderboard,
    dailyLeaderboard,
    modeLeaderboard,
    playerRanks,
    loading,
    error,
    currentMode,
    globalPage,
    friendsPage,
    dailyPage,
    modePage,
    refreshGlobal,
    refreshFriends,
    refreshDaily,
    refreshMode,
    loadMoreGlobal,
    loadMoreFriends,
    loadMoreDaily,
    loadMoreMode,
    setCurrentMode,
    refreshAll,
    fetchPlayerRanks,
  };
}

// Hook for incrementing daily/mode stats from gameplay
export function useLeaderboardStats(userId: string | null) {
  const incrementDailyStats = useCallback(async (
    gamesPlayed: number = 0,
    gamesWon: number = 0,
    correctWords: number = 0,
    xpEarned: number = 0,
    nectarEarned: number = 0,
    wpm: number = 0,
    streak: number = 0
  ) => {
    if (!userId) return;

    try {
      await supabase.rpc('increment_daily_stats', {
        p_user_id: userId,
        p_games_played: gamesPlayed,
        p_games_won: gamesWon,
        p_correct_words: correctWords,
        p_xp_earned: xpEarned,
        p_nectar_earned: nectarEarned,
        p_wpm: wpm,
        p_streak: streak,
      });
    } catch (err) {
      console.error('[useLeaderboardStats] Increment daily error:', err);
    }
  }, [userId]);

  const incrementModeStats = useCallback(async (
    mode: GameMode,
    gamesPlayed: number = 0,
    gamesWon: number = 0,
    correctWords: number = 0,
    wpm: number = 0,
    streak: number = 0
  ) => {
    if (!userId) return;

    try {
      await supabase.rpc('increment_mode_stats', {
        p_user_id: userId,
        p_mode: mode,
        p_games_played: gamesPlayed,
        p_games_won: gamesWon,
        p_correct_words: correctWords,
        p_wpm: wpm,
        p_streak: streak,
      });
    } catch (err) {
      console.error('[useLeaderboardStats] Increment mode error:', err);
    }
  }, [userId]);

  return {
    incrementDailyStats,
    incrementModeStats,
  };
}