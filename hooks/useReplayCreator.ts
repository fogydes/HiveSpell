import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { ReplayEvent, ReplayEventType } from '../types/multiplayer';

interface ReplayEventInput {
  event_type: ReplayEventType;
  player_id: string | null;
  word: string | null;
  wpm: number | null;
  time_taken_ms: number | null;
  streak: number | null;
  metadata: Record<string, unknown>;
}

interface UseReplayCreatorOptions {
  roomId: string | null;
  userId: string | null;
  isRanked: boolean;
  mode: string;
  seasonId: string | null;
  currentRoom: {
    id: string;
    gameState?: {
      currentWord?: string;
      currentTurnPlayerId?: string;
      turnOrder?: string[];
      roundNumber?: number;
      streak?: number;
      winnerId?: string | null;
      winnerName?: string | null;
      recentWords?: string[];
    };
    players: Record<string, {
      id: string;
      name: string;
      status: string;
      score: number;
      corrects: number;
      streak: number;
    }>;
    status: string;
  } | null;
}

export function useReplayCreator(options: UseReplayCreatorOptions) {
  const {
    roomId,
    userId,
    isRanked,
    mode,
    seasonId,
    currentRoom,
  } = options;

  const eventsRef = useRef<ReplayEventInput[]>([]);
  const sequenceNumRef = useRef(0);
  const gameStartTimeRef = useRef<number | null>(null);
  const gameEndTimeRef = useRef<number | null>(null);
  const winnerIdRef = useRef<string | null>(null);
  const playerStatsRef = useRef<Record<string, {
    correct_words: number;
    incorrect_words: number;
    total_wpm: number;
    max_streak: number;
    total_time_ms: number;
    eliminated_at_ms: number | null;
    final_rank: number;
  }>>({});
  const isFinalizedRef = useRef(false);

  const addEvent = useCallback((
    event_type: ReplayEventType,
    playerId: string | null = null,
    word: string | null = null,
    wpm: number | null = null,
    time_taken_ms: number | null = null,
    streak: number | null = null,
    metadata: Record<string, unknown> = {}
  ) => {
    if (!roomId) return;

    const timestampMs = gameStartTimeRef.current
      ? Date.now() - gameStartTimeRef.current
      : 0;

    const event: ReplayEventInput = {
      event_type,
      player_id: playerId,
      word,
      wpm,
      time_taken_ms,
      streak,
      metadata,
    };

    eventsRef.current.push({
      ...event,
    });

    sequenceNumRef.current++;
  }, [roomId]);

  // Record game start
  const recordGameStart = useCallback(() => {
    if (!roomId || !currentRoom) return;
    gameStartTimeRef.current = Date.now();
    gameEndTimeRef.current = null;
    winnerIdRef.current = null;
    eventsRef.current = [];
    sequenceNumRef.current = 0;
    playerStatsRef.current = {};
    isFinalizedRef.current = false;
    addEvent('game_start', null, null, null, null, null, { mode, season: seasonId });
  }, [roomId, currentRoom, mode, seasonId, addEvent]);

  // Record turn start
  const recordTurnStart = useCallback((playerId: string) => {
    addEvent('turn_start', playerId);
  }, [addEvent]);

  // Record turn end
  const recordTurnEnd = useCallback((playerId: string) => {
    addEvent('turn_end', playerId);
  }, [addEvent]);

  // Record word spoken (by game)
  const recordWordSpoken = useCallback((word: string, playerId: string) => {
    addEvent('word_spoken', playerId, word);
  }, [addEvent]);

  // Record correct word
  const recordWordCorrect = useCallback((
    playerId: string,
    word: string,
    wpm: number,
    timeTakenMs: number,
    streak: number
  ) => {
    addEvent('word_correct', playerId, word, wpm, timeTakenMs, streak);

    // Update player stats
    if (!playerStatsRef.current[playerId]) {
      playerStatsRef.current[playerId] = {
        correct_words: 0,
        incorrect_words: 0,
        total_wpm: 0,
        max_streak: 0,
        total_time_ms: 0,
        eliminated_at_ms: null,
        final_rank: 0,
      };
    }
    const stats = playerStatsRef.current[playerId];
    stats.correct_words++;
    stats.total_wpm += wpm;
    stats.max_streak = Math.max(stats.max_streak, streak);
    stats.total_time_ms += timeTakenMs;
  }, [addEvent]);

  // Record incorrect word
  const recordWordIncorrect = useCallback((
    playerId: string,
    word: string,
    timeTakenMs: number
  ) => {
    addEvent('word_incorrect', playerId, word, null, timeTakenMs, 0);

    if (!playerStatsRef.current[playerId]) {
      playerStatsRef.current[playerId] = {
        correct_words: 0,
        incorrect_words: 0,
        total_wpm: 0,
        max_streak: 0,
        total_time_ms: 0,
        eliminated_at_ms: null,
        final_rank: 0,
      };
    }
    const stats = playerStatsRef.current[playerId];
    stats.incorrect_words++;
    stats.total_time_ms += timeTakenMs;
  }, [addEvent]);

  // Record player elimination
  const recordPlayerEliminated = useCallback((playerId: string, rank: number) => {
    addEvent('player_eliminated', playerId, null, null, null, null, { rank });
    if (playerStatsRef.current[playerId]) {
      playerStatsRef.current[playerId].eliminated_at_ms = gameStartTimeRef.current
        ? Date.now() - gameStartTimeRef.current
        : null;
      playerStatsRef.current[playerId].final_rank = rank;
    }
  }, [addEvent]);

  // Record game end with winner
  const recordGameEnd = useCallback(async (winnerId: string | null) => {
    if (!roomId || isFinalizedRef.current) return;
    isFinalizedRef.current = true;

    gameEndTimeRef.current = Date.now();
    winnerIdRef.current = winnerId;

    const gameDurationMs = gameStartTimeRef.current
      ? gameEndTimeRef.current - gameStartTimeRef.current
      : 0;

    addEvent('game_end', winnerId, null, null, null, null, {
      winner_id: winnerId,
    });

    // Prepare player stats for all players
    const finalPlayerStats: Record<string, any> = {};
    if (currentRoom?.players) {
      Object.values(currentRoom.players).forEach((player, index) => {
        const stats = playerStatsRef.current[player.id] || {
          correct_words: 0,
          incorrect_words: 0,
          total_wpm: 0,
          max_streak: 0,
          total_time_ms: 0,
          eliminated_at_ms: null,
          final_rank: index + 1,
        };
        finalPlayerStats[player.id] = stats;
      });
    }

    // Create replay via RPC
    try {
      const eventsData = eventsRef.current.map((e, index) => ({
        ...e,
        sequence_num: index + 1,
        timestamp_ms: gameStartTimeRef.current
          ? Date.now() - gameStartTimeRef.current - (gameEndTimeRef.current! - Date.now()) + (index * 100) // Approximate
          : index * 100,
      }));

      const { data, error } = await supabase.rpc('create_game_replay', {
        p_room_id: roomId,
        p_season_id: seasonId,
        p_mode: mode,
        p_is_ranked: isRanked,
        p_started_at: new Date(gameStartTimeRef.current || Date.now()).toISOString(),
        p_ended_at: new Date(gameEndTimeRef.current || Date.now()).toISOString(),
        p_winner_id: winnerId,
        p_total_players: currentRoom?.players ? Object.keys(currentRoom.players).length : 0,
        p_game_duration_ms: gameDurationMs,
        p_events: eventsData,
        p_player_stats: finalPlayerStats,
      });

      if (error) {
        console.error('[ReplayCreator] Failed to create replay:', error);
      } else {
        console.log('[ReplayCreator] Replay created:', data);
      }
    } catch (err) {
      console.error('[ReplayCreator] Error creating replay:', err);
    }
  }, [roomId, isRanked, mode, seasonId, currentRoom, addEvent]);

  // Effect to track game state changes
  useEffect(() => {
    if (!currentRoom || !roomId) return;

    const gameState = currentRoom.gameState;
    const status = currentRoom.status;

    // Track game start
    if (status === 'playing' && gameState?.currentWord && !gameStartTimeRef.current) {
      recordGameStart();
    }

    // Track turn changes
    if (gameState?.currentTurnPlayerId) {
      // This would need a previous value comparison in a real implementation
      // For now we'll track via the driver hook
    }

    // Track game end
    if (status === 'finished' && gameState?.winnerId && !isFinalizedRef.current) {
      recordGameEnd(gameState.winnerId);
    }
  }, [currentRoom, roomId, recordGameStart, recordGameEnd]);

  return {
    addEvent,
    recordGameStart,
    recordTurnStart,
    recordTurnEnd,
    recordWordSpoken,
    recordWordCorrect,
    recordWordIncorrect,
    recordPlayerEliminated,
    recordGameEnd,
  };
}
