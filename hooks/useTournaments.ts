import { useCallback, useState, useEffect } from "react";
import { supabase } from "@/services/supabase";

export interface Tournament {
  id: string;
  name: string;
  description: string;
  season_id: string;
  mode: string;
  format: string;
  max_participants: number;
  min_rating: number;
  max_rating: number | null;
  entry_fee_nectar: number;
  prize_pool_nectar: number;
  prize_pool_cosmetics: any[];
  starts_at: string;
  registration_closes_at: string;
  check_in_starts_at: string | null;
  status: 'upcoming' | 'registration' | 'check_in' | 'in_progress' | 'completed' | 'cancelled';
  current_round: number;
  total_rounds: number;
  bracket_data: any;
  settings: any;
  created_by: string;
  created_at: string;
  updated_at: string;
  participant_count: number;
  is_registered?: boolean;
}

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  user_id: string;
  seed: number | null;
  rating_at_registration: number;
  status: 'registered' | 'checked_in' | 'active' | 'eliminated' | 'winner' | 'disqualified' | 'withdrawn';
  current_round: number;
  final_placement: number | null;
  prize_claimed: boolean;
  joined_at: string;
  checked_in_at: string | null;
  eliminated_at: string | null;
  username?: string;
  avatar_url?: string;
}

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  round_number: number;
  match_number: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  room_id: string | null;
  status: 'pending' | 'ready' | 'in_progress' | 'completed' | 'walkover' | 'dispute';
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  score: any;
  player1_username: string | null;
  player2_username: string | null;
  winner_username: string | null;
}

export interface TournamentBracketNode {
  bracket_type: string;
  round_number: number;
  position: number;
  match_id: string | null;
  participant1_id: string | null;
  participant2_id: string | null;
  next_match_id: string | null;
  next_match_position: string | null;
  participant1_username: string | null;
  participant2_username: string | null;
  participant1_rating: number | null;
  participant2_rating: number | null;
}

export function useTournaments() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listTournaments = useCallback(async (
    seasonId?: string,
    status?: string,
    mode?: string,
    limit = 20,
    offset = 0
  ): Promise<Tournament[]> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc("list_tournaments", {
        p_season_id: seasonId,
        p_status: status,
        p_mode: mode,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) throw error;
      return data || [];
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch tournaments");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getTournament = useCallback(async (tournamentId: string): Promise<Tournament | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc("get_tournament", {
        p_tournament_id: tournamentId,
      });

      if (error) throw error;
      return data?.[0] || null;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch tournament");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createTournament = useCallback(async (params: {
    name: string;
    description: string;
    season_id: string;
    mode: string;
    format?: string;
    max_participants?: number;
    min_rating?: number;
    max_rating?: number | null;
    entry_fee_nectar?: number;
    prize_pool_nectar?: number;
    starts_at: string;
    registration_closes_at: string;
    settings?: any;
  }): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc("create_tournament", {
        p_name: params.name,
        p_description: params.description,
        p_season_id: params.season_id,
        p_mode: params.mode,
        p_format: params.format || 'single_elimination',
        p_max_participants: params.max_participants || 64,
        p_min_rating: params.min_rating || 0,
        p_max_rating: params.max_rating,
        p_entry_fee_nectar: params.entry_fee_nectar || 0,
        p_prize_pool_nectar: params.prize_pool_nectar || 0,
        p_starts_at: params.starts_at,
        p_registration_closes_at: params.registration_closes_at,
        p_settings: params.settings || {},
      });

      if (error) throw error;
      return data?.[0]?.tournament_id || null;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create tournament");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const registerForTournament = useCallback(async (tournamentId: string): Promise<{ success: boolean; message: string }> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc("register_for_tournament", {
        p_tournament_id: tournamentId,
      });

      if (error) throw error;
      return data?.[0] || { success: false, message: "Unknown error" };
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to register");
      return { success: false, message: err instanceof Error ? err.message : "Failed to register" };
    } finally {
      setLoading(false);
    }
  }, []);

  const checkInTournament = useCallback(async (tournamentId: string): Promise<{ success: boolean; message: string }> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc("check_in_tournament", {
        p_tournament_id: tournamentId,
      });

      if (error) throw error;
      return data?.[0] || { success: false, message: "Unknown error" };
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to check in");
      return { success: false, message: err instanceof Error ? err.message : "Failed to check in" };
    } finally {
      setLoading(false);
    }
  }, []);

  const startTournament = useCallback(async (tournamentId: string): Promise<{ success: boolean; message: string }> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc("start_tournament", {
        p_tournament_id: tournamentId,
      });

      if (error) throw error;
      return data?.[0] || { success: false, message: "Unknown error" };
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start tournament");
      return { success: false, message: err instanceof Error ? err.message : "Failed to start tournament" };
    } finally {
      setLoading(false);
    }
  }, []);

  const reportMatchResult = useCallback(async (
    matchId: string,
    winnerId: string,
    score?: any
  ): Promise<{ success: boolean; message: string }> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc("report_tournament_match_result", {
        p_match_id: matchId,
        p_winner_id: winnerId,
        p_score: score || null,
      });

      if (error) throw error;
      return data?.[0] || { success: false, message: "Unknown error" };
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to report result");
      return { success: false, message: err instanceof Error ? err.message : "Failed to report result" };
    } finally {
      setLoading(false);
    }
  }, []);

  const getTournamentMatches = useCallback(async (
    tournamentId: string,
    roundNumber?: number
  ): Promise<TournamentMatch[]> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc("get_tournament_matches", {
        p_tournament_id: tournamentId,
        p_round_number: roundNumber,
      });

      if (error) throw error;
      return data || [];
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch matches");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getTournamentBracket = useCallback(async (
    tournamentId: string
  ): Promise<TournamentBracketNode[]> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc("get_tournament_bracket", {
        p_tournament_id: tournamentId,
      });

      if (error) throw error;
      return data || [];
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch bracket");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    listTournaments,
    getTournament,
    createTournament,
    registerForTournament,
    checkInTournament,
    startTournament,
    reportMatchResult,
    getTournamentMatches,
    getTournamentBracket,
    loading,
    error,
    clearError: () => setError(null),
  };
}

// Hook for real-time tournament subscriptions
export function useTournamentSubscription(tournamentId: string | null, onUpdate?: () => void) {
  useEffect(() => {
    if (!tournamentId) return;

    const channel = supabase
      .channel(`tournament:${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${tournamentId}`,
        },
        () => onUpdate?.()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_matches',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => onUpdate?.()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_participants',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => onUpdate?.()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, onUpdate]);
}

// Helper: Format tournament status for display
export function getTournamentStatusDisplay(status: Tournament['status']): { label: string; color: string; icon: string } {
  switch (status) {
    case 'upcoming':
      return { label: 'Upcoming', color: 'text-blue-400 bg-blue-400/20', icon: '📅' };
    case 'registration':
      return { label: 'Registering', color: 'text-emerald-400 bg-emerald-400/20', icon: '✅' };
    case 'check_in':
      return { label: 'Check-In', color: 'text-amber-400 bg-amber-400/20', icon: '📝' };
    case 'in_progress':
      return { label: 'Live', color: 'text-red-400 bg-red-400/20 animate-pulse', icon: '🔴' };
    case 'completed':
      return { label: 'Completed', color: 'text-purple-400 bg-purple-400/20', icon: '🏆' };
    case 'cancelled':
      return { label: 'Cancelled', color: 'text-slate-400 bg-slate-400/20', icon: '❌' };
    default:
      return { label: status, color: 'text-slate-400 bg-slate-400/20', icon: '❓' };
  }
}

// Helper: Format tournament format for display
export function getTournamentFormatDisplay(format: string): string {
  switch (format) {
    case 'single_elimination': return 'Single Elimination';
    case 'double_elimination': return 'Double Elimination';
    case 'swiss': return 'Swiss System';
    case 'round_robin': return 'Round Robin';
    default: return format;
  }
}