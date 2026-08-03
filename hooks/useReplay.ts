import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import type { GameReplay, ReplayTimelineEvent, ReplayPlaybackState, ReplayEventType, PlayerReplayStats } from '../types/multiplayer';

interface UseReplayOptions {
  replayId?: number;
  roomId?: string;
  autoLoad?: boolean;
}

interface UseReplayReturn {
  // State
  playbackState: ReplayPlaybackState;
  loading: boolean;
  error: string | null;

  // Actions
  loadReplay: (replayId: number) => Promise<void>;
  loadReplayByRoom: (roomId: string) => Promise<void>;
  loadPlayerReplays: (userId: string, limit?: number, offset?: number) => Promise<GameReplay[]>;
  play: () => void;
  pause: () => void;
  seek: (eventIndex: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
  reset: () => void;

  // Helpers
  getCurrentEvent: () => ReplayTimelineEvent | null;
  getEventAtTime: (timeMs: number) => ReplayTimelineEvent | null;
  formatTime: (ms: number) => string;
  getPlayerStats: (playerId: string) => PlayerReplayStats | null;
}

const DEFAULT_PLAYBACK_SPEEDS = [0.5, 1, 2, 4];

export function useReplay(options: UseReplayOptions = {}): UseReplayReturn {
  const { replayId, roomId, autoLoad = false } = options;

  const [playbackState, setPlaybackState] = useState<ReplayPlaybackState>({
    replay: null,
    timeline: [],
    currentEventIndex: -1,
    isPlaying: false,
    playbackSpeed: 1,
    currentTimeMs: 0,
    totalDurationMs: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(0);

  // Load replay by ID
  const loadReplay = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch replay data
      const { data: replayData, error: replayError } = await supabase
        .rpc('get_game_replay', { p_replay_id: id });

      if (replayError) throw replayError;
      if (!replayData?.length) throw new Error('Replay not found');

      const replay = replayData[0] as GameReplay;

      // Fetch timeline events
      const { data: timelineData, error: timelineError } = await supabase
        .rpc('get_replay_timeline', { p_replay_id: id });

      if (timelineError) throw timelineError;

      const timeline = (timelineData || []) as ReplayTimelineEvent[];
      const totalDurationMs = replay.game_duration_ms ||
        (timeline.length > 0 ? timeline[timeline.length - 1].timestamp_ms : 0);

      setPlaybackState({
        replay,
        timeline,
        currentEventIndex: -1,
        isPlaying: false,
        playbackSpeed: 1,
        currentTimeMs: 0,
        totalDurationMs,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load replay');
      console.error('Error loading replay:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load replay by room ID (most recent)
  const loadReplayByRoom = useCallback(async (roomId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: replayData, error: replayError } = await supabase
        .rpc('get_replay_by_room', { p_room_id: roomId });

      if (replayError) throw replayError;
      if (!replayData?.length) throw new Error('No replay found for this room');

      const replay = replayData[0] as GameReplay;
      await loadReplay(replay.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load replay');
      console.error('Error loading replay by room:', err);
    } finally {
      setLoading(false);
    }
  }, [loadReplay]);

  // Load player's replay history
  const loadPlayerReplays = useCallback(async (
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<GameReplay[]> => {
    try {
      const { data, error } = await supabase
        .rpc('get_player_replays', {
          p_user_id: userId,
          p_limit: limit,
          p_offset: offset
        });

      if (error) throw error;
      return (data || []) as GameReplay[];
    } catch (err) {
      console.error('Error loading player replays:', err);
      return [];
    }
  }, []);

  // Playback control
  const play = useCallback(() => {
    setPlaybackState(prev => {
      if (prev.isPlaying || prev.timeline.length === 0) return prev;
      return { ...prev, isPlaying: true };
    });

    lastTimestampRef.current = performance.now();

    const animate = (timestamp: number) => {
      setPlaybackState(prev => {
        if (!prev.isPlaying || prev.timeline.length === 0) return prev;

        const deltaTime = (timestamp - lastTimestampRef.current) * prev.playbackSpeed;
        lastTimestampRef.current = timestamp;

        const newTimeMs = prev.currentTimeMs + deltaTime;
        const nextIndex = prev.timeline.findIndex(e => e.timestamp_ms > newTimeMs);

        let newEventIndex = prev.currentEventIndex;
        if (nextIndex !== -1) {
          newEventIndex = nextIndex - 1;
        } else if (prev.currentEventIndex < prev.timeline.length - 1) {
          newEventIndex = prev.timeline.length - 1;
        }

        // Check if playback finished
        if (newTimeMs >= prev.totalDurationMs) {
          return {
            ...prev,
            isPlaying: false,
            currentTimeMs: prev.totalDurationMs,
            currentEventIndex: prev.timeline.length - 1,
          };
        }

        return {
          ...prev,
          currentTimeMs: newTimeMs,
          currentEventIndex: newEventIndex,
        };
      });

      // Continue animation if still playing
      setPlaybackState(prev => {
        if (prev.isPlaying) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
        return prev;
      });
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  const pause = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setPlaybackState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const seek = useCallback((eventIndex: number) => {
    setPlaybackState(prev => {
      const clampedIndex = Math.max(-1, Math.min(eventIndex, prev.timeline.length - 1));
      const newTimeMs = clampedIndex >= 0 ? prev.timeline[clampedIndex].timestamp_ms : 0;

      return {
        ...prev,
        currentEventIndex: clampedIndex,
        currentTimeMs: newTimeMs,
        isPlaying: false,
      };
    });

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    if (!DEFAULT_PLAYBACK_SPEEDS.includes(speed)) return;

    setPlaybackState(prev => ({
      ...prev,
      playbackSpeed: speed,
    }));
  }, []);

  const stepForward = useCallback(() => {
    setPlaybackState(prev => {
      if (prev.currentEventIndex >= prev.timeline.length - 1) return prev;
      const newIndex = prev.currentEventIndex + 1;
      return {
        ...prev,
        currentEventIndex: newIndex,
        currentTimeMs: prev.timeline[newIndex].timestamp_ms,
        isPlaying: false,
      };
    });

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const stepBackward = useCallback(() => {
    setPlaybackState(prev => {
      if (prev.currentEventIndex <= -1) return prev;
      const newIndex = prev.currentEventIndex - 1;
      const newTimeMs = newIndex >= 0 ? prev.timeline[newIndex].timestamp_ms : 0;
      return {
        ...prev,
        currentEventIndex: newIndex,
        currentTimeMs: newTimeMs,
        isPlaying: false,
      };
    });

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setPlaybackState(prev => ({
      ...prev,
      currentEventIndex: -1,
      currentTimeMs: 0,
      isPlaying: false,
    }));
  }, []);

  // Helpers
  const getCurrentEvent = useCallback(() => {
    const { timeline, currentEventIndex } = playbackState;
    if (currentEventIndex < 0 || currentEventIndex >= timeline.length) return null;
    return timeline[currentEventIndex];
  }, [playbackState]);

  const getEventAtTime = useCallback((timeMs: number) => {
    const { timeline } = playbackState;
    const index = timeline.findIndex(e => e.timestamp_ms > timeMs);
    if (index === -1) return timeline.length > 0 ? timeline[timeline.length - 1] : null;
    return index > 0 ? timeline[index - 1] : timeline[0];
  }, [playbackState]);

  const formatTime = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const getPlayerStats = useCallback((playerId: string) => {
    const { replay } = playbackState;
    if (!replay || !replay.player_stats) return null;
    return replay.player_stats[playerId] || null;
  }, [playbackState]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      if (replayId) {
        loadReplay(replayId);
      } else if (roomId) {
        loadReplayByRoom(roomId);
      }
    }
  }, [autoLoad, replayId, roomId, loadReplay, loadReplayByRoom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    playbackState,
    loading,
    error,
    loadReplay,
    loadReplayByRoom,
    loadPlayerReplays,
    play,
    pause,
    seek,
    setPlaybackSpeed,
    stepForward,
    stepBackward,
    reset,
    getCurrentEvent,
    getEventAtTime,
    formatTime,
    getPlayerStats,
  };
}
