import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import type { GameReplay } from '../types/multiplayer';
import { ReplayPlayer } from './ReplayPlayer';

interface ReplayHistoryProps {
  onClose?: () => void;
}

export const ReplayHistory: React.FC<ReplayHistoryProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [replays, setReplays] = useState<GameReplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReplay, setSelectedReplay] = useState<GameReplay | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 20;

  const loadReplays = useCallback(async (pageNum = 0, append = false) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_player_replays', {
          p_user_id: user.uid,
          p_limit: LIMIT,
          p_offset: pageNum * LIMIT,
        });

      if (rpcError) throw rpcError;

      const newReplays = (data || []) as GameReplay[];

      if (append) {
        setReplays(prev => [...prev, ...newReplays]);
      } else {
        setReplays(newReplays);
      }

      setHasMore(newReplays.length === LIMIT);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load replays');
      console.error('Error loading replays:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadReplays(0, false);
  }, [loadReplays]);

  const loadMore = () => {
    if (!loading && hasMore) {
      loadReplays(page + 1, true);
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '—';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'ranked': return '#f59e0b';
      case 'competitive': return '#ef4444';
      case 'genius': return '#a855f7';
      case 'hard': return '#f97316';
      case 'medium': return '#3b82f6';
      case 'easy': return '#22c55e';
      case 'baby': return '#ec4899';
      default: return '#6b7280';
    }
  };

  if (selectedReplay) {
    return (
      <ReplayPlayer
        replayId={selectedReplay.id}
        onClose={() => setSelectedReplay(null)}
      />
    );
  }

  return (
    <div className="replay-history">
      <div className="replay-history-header">
        <h2>📼 Replay History</h2>
        {onClose && <button className="close-btn" onClick={onClose}>✕</button>}
      </div>

      {error && (
        <div className="replay-error">
          <p>{error}</p>
          <button onClick={() => loadReplays(0, false)}>Retry</button>
        </div>
      )}

      {loading && replays.length === 0 && (
        <div className="replay-loading">Loading replays...</div>
      )}

      {replays.length === 0 && !loading && !error && (
        <div className="replay-empty">
          <p>No replays yet. Play some games to build your history!</p>
        </div>
      )}

      <div className="replay-list">
        {replays.map(replay => (
          <button
            key={replay.id}
            className="replay-card"
            onClick={() => setSelectedReplay(replay)}
          >
            <div className="replay-card-header">
              <div className="replay-mode-badge" style={{ backgroundColor: getModeColor(replay.mode) }}>
                {replay.is_ranked ? '🏆 ' : ''}{replay.mode}
              </div>
              <div className="replay-date">{formatDate(replay.started_at)}</div>
            </div>
            <div className="replay-card-body">
              <div className="replay-duration">⏱ {formatDuration(replay.game_duration_ms)}</div>
              <div className="replay-players">👥 {replay.total_players} players</div>
              {replay.winner_username && (
                <div className="replay-winner">🏆 {replay.winner_username}</div>
              )}
            </div>
            <div className="replay-card-footer">
              <span>Tap to watch replay</span>
            </div>
          </button>
        ))}
      </div>

      {hasMore && (
        <button className="load-more-btn" onClick={loadMore} disabled={loading}>
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
};

export default ReplayHistory;
