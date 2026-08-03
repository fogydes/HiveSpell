import { useCallback, useRef, useEffect, useState } from "react";
import { supabase } from "@/services/supabase";
import { useDeviceFingerprint, DeviceFingerprint } from "./useDeviceFingerprint";

/**
 * Competitive Integrity Hook
 * Handles:
 * - Keystroke logging for replay verification
 * - Ranked rating management (Glicko-2)
 * - Anti-cheat verification
 * - Device fingerprinting
 */

export interface KeystrokeEvent {
  char: string;
  t: number; // timestamp in ms since start of word
}

export interface RankedRating {
  user_id: string;
  season_id: string;
  mode: string;
  rating: number;
  rd: number;
  volatility: number;
  games_played: number;
  wins: number;
  losses: number;
  placement_matches_remaining: number;
  tier: string;
  last_played_at: string | null;
}

export interface RankedLeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  rating: number;
  rd: number;
  games_played: number;
  wins: number;
  losses: number;
  tier: string;
  win_rate: number;
}

export interface MatchResult {
  new_rating: number;
  new_rd: number;
  new_volatility: number;
  rating_change: number;
  was_placement: boolean;
}

export interface KeystrokeVerificationResult {
  verified: boolean;
  anomaly_score: number;
  anomaly_reasons: string[];
  is_suspicious: boolean;
}

export interface AutoFlagResult {
  success: boolean;
  error?: string;
}

export function useCompetitiveIntegrity() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Device fingerprinting
  const { fingerprint, generate: generateFingerprint } = useDeviceFingerprint();

  // Keystroke log for current word
  const keystrokeBufferRef = useRef<KeystrokeEvent[]>([]);
  const wordStartTimeRef = useRef<number>(0);
  const currentWordRef = useRef<string>("");
  const currentRoomIdRef = useRef<string>("");
  const currentPlayerIdRef = useRef<string>("");
  const enabledRef = useRef(false);

  /**
   * Enable keystroke logging for a room
   */
  const enableKeystrokeLogging = useCallback((
    roomId: string,
    playerId: string
  ) => {
    currentRoomIdRef.current = roomId;
    currentPlayerIdRef.current = playerId;
    enabledRef.current = true;
  }, []);

  /**
   * Disable keystroke logging
   */
  const disableKeystrokeLogging = useCallback(() => {
    enabledRef.current = false;
    keystrokeBufferRef.current = [];
    wordStartTimeRef.current = 0;
    currentWordRef.current = "";
    currentRoomIdRef.current = "";
    currentPlayerIdRef.current = "";
  }, []);

  /**
   * Start tracking keystrokes for a new word
   */
  const startWord = useCallback((word: string) => {
    if (!enabledRef.current) return;

    currentWordRef.current = word;
    wordStartTimeRef.current = Date.now();
    keystrokeBufferRef.current = [];
  }, []);

  /**
   * Record a keystroke
   */
  const recordKeystroke = useCallback((char: string) => {
    if (!enabledRef.current) return;

    const now = Date.now();
    const relativeTime = now - wordStartTimeRef.current;

    keystrokeBufferRef.current.push({
      char,
      t: relativeTime,
    });
  }, []);

  /**
   * Submit keystroke log for the completed word
   */
  const submitKeystrokeLog = useCallback(async (
    word: string,
    wpm: number,
    timeTakenMs: number
  ) => {
    if (!enabledRef.current || !currentRoomIdRef.current || !currentPlayerIdRef.current) {
      return;
    }

    const keystrokes = keystrokeBufferRef.current;
    const wordLength = word.length;

    // Reset buffer for next word
    keystrokeBufferRef.current = [];
    wordStartTimeRef.current = 0;
    currentWordRef.current = "";

    try {
      const { error } = await supabase.rpc("log_keystroke_data", {
        p_room_id: currentRoomIdRef.current,
        p_player_id: currentPlayerIdRef.current,
        p_word: word,
        p_keystrokes: keystrokes,
        p_wpm: wpm,
        p_word_length: wordLength,
        p_time_taken_ms: timeTakenMs,
        p_device_fingerprint: fingerprint,
      });

      if (error) {
        console.error("Failed to log keystroke data:", error);
      }
    } catch (err) {
      console.error("Error submitting keystroke log:", err);
    }
  }, [fingerprint]);

  /**
   * Verify keystroke log for a word (anti-cheat)
   */
  const verifyKeystrokeLog = useCallback(async (
    roomId: string,
    playerId: string,
    word: string
  ): Promise<KeystrokeVerificationResult | null> => {
    try {
      const { data, error } = await supabase.rpc("verify_keystroke_log", {
        p_room_id: roomId,
        p_player_id: playerId,
        p_word: word,
      });

      if (error) {
        console.error("Failed to verify keystroke log:", error);
        return null;
      }

      const result = data?.[0] || null;

      // If verification found anomalies, auto-flag the player
      if (result && result.is_suspicious && result.anomaly_score > 0) {
        await autoFlagSuspiciousPlayer(roomId, playerId, word, result);
      }

      return result;
    } catch (err) {
      console.error("Error verifying keystroke log:", err);
      return null;
    }
  }, []);

  /**
   * Auto-flag suspicious player after keystroke verification
   */
  const autoFlagSuspiciousPlayer = useCallback(async (
    roomId: string,
    playerId: string,
    word: string,
    verificationResult: KeystrokeVerificationResult
  ): Promise<AutoFlagResult> => {
    try {
      const { error } = await supabase.rpc("auto_flag_suspicious_player", {
        p_user_id: playerId,
        p_room_id: roomId,
        p_word: word,
        p_anomaly_score: verificationResult.anomaly_score,
        p_anomaly_reasons: verificationResult.anomaly_reasons,
        p_device_fingerprint: fingerprint,
      });

      if (error) {
        console.error("Failed to auto-flag suspicious player:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error("Error auto-flagging suspicious player:", err);
      return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }, [fingerprint]);

  /**
   * Get ranked rating for a user
   */
  const getRankedRating = useCallback(async (
    userId: string,
    seasonId?: string,
    mode?: string
  ): Promise<RankedRating[]> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc("get_ranked_rating", {
        p_user_id: userId,
        p_season_id: seasonId,
        p_mode: mode,
      });

      if (error) throw error;
      return data || [];
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch ranked rating");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get ranked leaderboard for a season/mode
   */
  const getRankedLeaderboard = useCallback(async (
    mode: string,
    seasonId?: string,
    limit = 50,
    offset = 0
  ): Promise<RankedLeaderboardEntry[]> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc("get_ranked_leaderboard", {
        p_mode: mode,
        p_season_id: seasonId,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      setError(err.message || "Failed to fetch leaderboard");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update ranked rating after a match
   */
  const updateRankedRating = useCallback(async (
    playerId: string,
    seasonId: string,
    mode: string,
    opponentIds: string[],
    result: "win" | "loss" | "draw",
    place: number,
    totalPlayers: number,
    gameDurationMs: number,
    correctWords: number,
    maxWpm: number,
    maxStreak: number
  ): Promise<MatchResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc("update_ranked_rating", {
        p_player_id: playerId,
        p_season_id: seasonId,
        p_mode: mode,
        p_opponent_ids: opponentIds,
        p_result: result,
        p_place: place,
        p_total_players: totalPlayers,
        p_game_duration_ms: gameDurationMs,
        p_correct_words: correctWords,
        p_max_wpm: maxWpm,
        p_max_streak: maxStreak,
      });

      if (error) throw error;
      return data?.[0] || null;
    } catch (err: any) {
      setError(err.message || "Failed to update ranked rating");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get current active season
   */
  const getActiveSeason = useCallback(async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_active", true)
        .single();

      if (error) throw error;
      return data?.id || null;
    } catch (err) {
      console.error("Failed to get active season:", err);
      return null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disableKeystrokeLogging();
    };
  }, [disableKeystrokeLogging]);

  // Helper: Get tier from rating
  const getTierFromRating = useCallback((rating: number, placementRemaining: number): string => {
    if (placementRemaining > 0) return "Unranked (Placement)";
    if (rating >= 2200) return "Queen Bee";
    if (rating >= 2000) return "Hive Master";
    if (rating >= 1800) return "Hive Champion";
    if (rating >= 1600) return "Busy Bee";
    return "Newbee";
  }, []);

  // Helper: Get tier color
  const getTierColor = useCallback((tier: string): string => {
    switch (tier) {
      case "Queen Bee": return "text-amber-400 bg-amber-400/20";
      case "Hive Master": return "text-yellow-400 bg-yellow-400/20";
      case "Hive Champion": return "text-orange-400 bg-orange-400/20";
      case "Busy Bee": return "text-emerald-400 bg-emerald-400/20";
      case "Newbee": return "text-slate-400 bg-slate-400/20";
      default: return "text-purple-400 bg-purple-400/20";
    }
  }, []);

  return {
    // Keystroke logging
    enableKeystrokeLogging,
    disableKeystrokeLogging,
    startWord,
    recordKeystroke,
    submitKeystrokeLog,
    verifyKeystrokeLog,
    autoFlagSuspiciousPlayer,
    isLoggingEnabled: enabledRef.current,

    // Ranked system
    getRankedRating,
    getRankedLeaderboard,
    updateRankedRating,
    getActiveSeason,

    // Helpers
    getTierFromRating,
    getTierColor,

    // State
    loading,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hook for tracking keystrokes in an input element
 * Attaches to an input and records all keystrokes
 */
export function useKeystrokeTracker(
  inputRef: React.RefObject<HTMLInputElement | null>,
  onWordComplete: (word: string, wpm: number, timeTakenMs: number) => void,
  enabled: boolean = true
) {
  const { startWord, recordKeystroke, submitKeystrokeLog } = useCompetitiveIntegrity();
  const wordStartRef = useRef<number>(0);
  const currentWordRef = useRef<string>("");
  const lastValueRef = useRef<string>("");

  useEffect(() => {
    if (!enabled || !inputRef.current) return;

    const input = inputRef.current;
    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const newValue = target.value;
      const oldValue = lastValueRef.current;

      // Detect new characters typed
      if (newValue.length > oldValue.length) {
        const addedChars = newValue.slice(oldValue.length);
        for (const char of addedChars) {
          recordKeystroke(char);
        }
      }

      lastValueRef.current = newValue;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Track backspace/delete as well
      if (e.key === "Backspace" || e.key === "Delete") {
        recordKeystroke("[BACKSPACE]");
      }
    };

    input.addEventListener("input", handleInput);
    input.addEventListener("keydown", handleKeyDown);

    return () => {
      input.removeEventListener("input", handleInput);
      input.removeEventListener("keydown", handleKeyDown);
    };
  }, [inputRef, enabled, recordKeystroke]);

  // Call this when a new word starts
  const handleWordStart = useCallback((word: string) => {
    currentWordRef.current = word;
    wordStartRef.current = Date.now();
    lastValueRef.current = "";
    startWord(word);
  }, [startWord]);

  // Call this when word is submitted
  const handleWordSubmit = useCallback((wpm: number) => {
    const timeTakenMs = Date.now() - wordStartRef.current;
    if (currentWordRef.current) {
      submitKeystrokeLog(currentWordRef.current, wpm, timeTakenMs);
      onWordComplete(currentWordRef.current, wpm, timeTakenMs);
      currentWordRef.current = "";
    }
  }, [submitKeystrokeLog, onWordComplete]);

  return {
    handleWordStart,
    handleWordSubmit,
  };
}