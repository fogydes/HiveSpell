import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useFeatureFlag } from '../context/FeatureFlagsContext';
import type { KeystrokeLogEntry, KeystrokeLogFilters } from '../types/multiplayer';

interface AdminPanelProps {
  onClose?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const { user } = useAuth();
  const isAdminEnabled = useFeatureFlag('adminPanel');
  const [activeTab, setActiveTab] = useState<'keystrokeLogs' | 'rankedRatings' | 'seasons' | 'shadowBanQueue'>('keystrokeLogs');

  // Keystroke logs state
  const [keystrokeLogs, setKeystrokeLogs] = useState<KeystrokeLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<KeystrokeLogFilters>({
    suspicious_only: false,
    limit: 50,
    offset: 0,
  });
  const LIMIT = 50;

  const loadKeystrokeLogs = useCallback(async (pageNum = 0, append = false, newFilters?: KeystrokeLogFilters) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const currentFilters = newFilters || filters;
      const { data, error: rpcError } = await supabase
        .from('room_keystroke_log')
        .select(`
          *,
          profiles!inner(username, avatar_url)
        `)
        .order('submitted_at', { ascending: false })
        .range(pageNum * (currentFilters.limit || LIMIT), (pageNum + 1) * (currentFilters.limit || LIMIT) - 1);

      if (rpcError) throw rpcError;

      const newLogs: KeystrokeLogEntry[] = (data || []).map((log: any) => ({
        ...log,
        player_username: log.profiles?.username,
        player_avatar_url: log.profiles?.avatar_url,
      }));

      if (append) {
        setKeystrokeLogs(prev => [...prev, ...newLogs]);
      } else {
        setKeystrokeLogs(newLogs);
      }

      setHasMore(newLogs.length === (currentFilters.limit || LIMIT));
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load keystroke logs');
      console.error('Error loading keystroke logs:', err);
    } finally {
      setLoading(false);
    }
  }, [user, filters]);

  useEffect(() => {
    if (isAdminEnabled) {
      loadKeystrokeLogs(0, false);
    }
  }, [isAdminEnabled, loadKeystrokeLogs]);

  const loadMore = () => {
    if (!loading && hasMore) {
      loadKeystrokeLogs(page + 1, true);
    }
  };

  const handleFilterChange = (newFilters: Partial<KeystrokeLogFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    loadKeystrokeLogs(0, false, updatedFilters);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatAnomalyReasons = (reasons: string[]) => {
    if (!reasons || reasons.length === 0) return '—';
    return reasons.map(r => r.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ');
  };

  const getAnomalyScoreColor = (score: number) => {
    if (score >= 0.6) return '#ef4444'; // Red - suspicious
    if (score >= 0.3) return '#f59e0b'; // Amber - warning
    return '#22c55e'; // Green - clean
  };

  const getSuspiciousBadge = (suspicious: boolean, anomalyScore: number) => {
    if (suspicious) {
      return <span className="badge badge-suspicious">🚫 Suspicious ({Math.round(anomalyScore * 100)}%)</span>;
    }
    if (anomalyScore > 0) {
      return <span className="badge badge-warning">⚠️ Flagged ({Math.round(anomalyScore * 100)}%)</span>;
    }
    return <span className="badge badge-clean">✅ Clean</span>;
  };

  const keystrokeLogsView = (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2>🛡️ Admin Panel - Competitive Integrity</h2>
        {onClose && <button className="close-btn" onClick={onClose}>✕</button>}
      </div>

      <div className="admin-tabs">
        <button
          className={activeTab === 'keystrokeLogs' ? 'active' : ''}
          onClick={() => setActiveTab('keystrokeLogs')}
        >
          Keystroke Logs
        </button>
        <button
          className={activeTab === 'rankedRatings' ? 'active' : ''}
          onClick={() => setActiveTab('rankedRatings')}
        >
          Ranked Ratings
        </button>
        <button
          className={activeTab === 'seasons' ? 'active' : ''}
          onClick={() => setActiveTab('seasons')}
        >
          Seasons
        </button>
        <button
          className={activeTab === 'shadowBanQueue' ? 'active' : ''}
          onClick={() => setActiveTab('shadowBanQueue')}
        >
          Shadow Ban Queue
        </button>
      </div>

      {error && (
        <div className="admin-error">
          <p>{error}</p>
          <button onClick={() => loadKeystrokeLogs(0, false)}>Retry</button>
        </div>
      )}

      {activeTab === 'keystrokeLogs' && (
        <div className="keystroke-logs-section">
          <div className="filters-bar">
            <label className="filter-item">
              <input
                type="checkbox"
                checked={filters.suspicious_only || false}
                onChange={(e) => handleFilterChange({ suspicious_only: e.target.checked })}
              />
              Show suspicious only
            </label>
          </div>

          {loading && keystrokeLogs.length === 0 && (
            <div className="admin-loading">Loading keystroke logs...</div>
          )}

          {keystrokeLogs.length === 0 && !loading && !error && (
            <div className="admin-empty">
              <p>No keystroke logs found.</p>
            </div>
          )}

          <div className="logs-table-container">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Player</th>
                  <th>Room</th>
                  <th>Word</th>
                  <th>WPM</th>
                  <th>Time (ms)</th>
                  <th>Anomaly Score</th>
                  <th>Status</th>
                  <th>Reasons</th>
                </tr>
              </thead>
              <tbody>
                {keystrokeLogs.map(log => (
                  <tr key={log.id} className={log.suspicious ? 'suspicious-row' : ''}>
                    <td className="timestamp">{formatDate(log.submitted_at)}</td>
                    <td className="player">
                      <img
                        src={log.player_avatar_url || '/default-avatar.png'}
                        alt={log.player_username || 'Player'}
                        className="avatar-sm"
                      />
                      <span>{log.player_username || log.player_id.slice(0, 8)}</span>
                    </td>
                    <td className="room-id">{log.room_id.slice(0, 8)}...</td>
                    <td className="word">"{log.word}"</td>
                    <td className="wpm">{log.wpm}</td>
                    <td className="time">{log.time_taken_ms}ms</td>
                    <td className="anomaly-score">
                      <div
                        className="anomaly-bar"
                        style={{ width: `${log.anomaly_score * 100}%`, backgroundColor: getAnomalyScoreColor(log.anomaly_score) }}
                      >
                        {Math.round(log.anomaly_score * 100)}%
                      </div>
                    </td>
                    <td className="status">{getSuspiciousBadge(log.suspicious, log.anomaly_score)}</td>
                    <td className="reasons" title={formatAnomalyReasons(log.anomaly_reasons)}>
                      {formatAnomalyReasons(log.anomaly_reasons)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <button className="load-more-btn" onClick={loadMore} disabled={loading}>
              {loading ? 'Loading...' : 'Load More'}
            </button>
          )}
        </div>
      )}

      {activeTab === 'rankedRatings' && (
        <div className="ranked-ratings-section">
          <RankedRatingsView />
        </div>
      )}

      {activeTab === 'seasons' && (
        <div className="seasons-section">
          <SeasonsView />
        </div>
      )}

      {activeTab === 'shadowBanQueue' && (
        <div className="shadow-ban-queue-section">
          <ShadowBanQueueView user={user} isAdminEnabled={isAdminEnabled} />
        </div>
      )}
    </div>
  );

  if (!isAdminEnabled) {
    return (
      <div className="admin-panel-disabled">
        <h3>🔒 Admin Panel</h3>
        <p>Admin panel is disabled. Enable the "adminPanel" feature flag to access.</p>
      </div>
    );
  }

  return keystrokeLogsView;
};

// Ranked Ratings View Component
const RankedRatingsView: React.FC = () => {
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasonId, setSeasonId] = useState<string>('');
  const [mode, setMode] = useState<string>('medium');

  useEffect(() => {
    loadRankedRatings();
  }, [seasonId, mode]);

  const loadRankedRatings = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('ranked_ratings')
        .select(`
          *,
          profiles!inner(username, avatar_url)
        `)
        .order('rating', { ascending: false });

      if (seasonId) {
        query = query.eq('season_id', seasonId);
      }
      if (mode) {
        query = query.eq('mode', mode);
      }
      query = query.limit(100);

      const { data, error } = await query;
      if (error) throw error;
      setRatings(data || []);
    } catch (err) {
      console.error('Error loading ranked ratings:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ranked-ratings-container">
      <div className="filters-bar">
        <select value={seasonId} onChange={e => setSeasonId(e.target.value)} className="filter-select">
          <option value="">All Seasons</option>
          <option value="2026-s1">Season 1: Dawn of the Hive</option>
        </select>
        <select value={mode} onChange={e => setMode(e.target.value)} className="filter-select">
          <option value="baby">Baby</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
          <option value="genius">Genius</option>
          <option value="competitive">Competitive</option>
        </select>
      </div>

      {loading ? (
        <div className="admin-loading">Loading ranked ratings...</div>
      ) : (
        <table className="logs-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Rating</th>
              <th>RD</th>
              <th>Volatility</th>
              <th>Games</th>
              <th>Wins</th>
              <th>Losses</th>
              <th>Win Rate</th>
              <th>Tier</th>
              <th>Placement</th>
            </tr>
          </thead>
          <tbody>
            {ratings.map((r, i) => (
              <tr key={r.user_id}>
                <td>{i + 1}</td>
                <td className="player">
                  <img src={r.profiles?.avatar_url || '/default-avatar.png'} alt={r.profiles?.username} className="avatar-sm" />
                  <span>{r.profiles?.username || r.user_id.slice(0, 8)}</span>
                </td>
                <td>{Math.round(r.rating)}</td>
                <td>{Math.round(r.rd)}</td>
                <td>{r.volatility?.toFixed(3) || '—'}</td>
                <td>{r.games_played}</td>
                <td>{r.wins}</td>
                <td>{r.losses}</td>
                <td>{r.games_played > 0 ? ((r.wins / r.games_played) * 100).toFixed(1) + '%' : '—'}</td>
                <td>
                  <span className={`tier-badge ${getTierClass(r.rating, r.placement_matches_remaining)}`}>
                    {r.placement_matches_remaining > 0 ? 'Unranked' : getTierName(r.rating)}
                  </span>
                </td>
                <td>{r.placement_matches_remaining > 0 ? `${r.placement_matches_remaining}/10` : 'Complete'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const SeasonsView: React.FC = () => {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSeasons();
  }, []);

  const loadSeasons = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      setSeasons(data || []);
    } catch (err) {
      console.error('Error loading seasons:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="seasons-container">
      {loading ? (
        <div className="admin-loading">Loading seasons...</div>
      ) : (
        <table className="logs-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Start</th>
              <th>End</th>
              <th>Active</th>
              <th>Modes</th>
              <th>Placement Matches</th>
              <th>Decay/Day</th>
            </tr>
          </thead>
          <tbody>
            {seasons.map(s => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>{s.name}</td>
                <td>{new Date(s.start_date).toLocaleDateString()}</td>
                <td>{new Date(s.end_date).toLocaleDateString()}</td>
                <td>{s.is_active ? '✅ Yes' : '❌ No'}</td>
                <td>{s.modes?.join(', ')}</td>
                <td>{s.placement_matches}</td>
                <td>{s.rating_decay_per_day}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

function getTierName(rating: number): string {
  if (rating >= 2200) return 'Queen Bee';
  if (rating >= 2000) return 'Hive Master';
  if (rating >= 1800) return 'Hive Champion';
  if (rating >= 1600) return 'Busy Bee';
  return 'Newbee';
}

function getTierClass(rating: number, placementRemaining: number): string {
  if (placementRemaining > 0) return 'tier-unranked';
  if (rating >= 2200) return 'tier-queen-bee';
  if (rating >= 2000) return 'tier-hive-master';
  if (rating >= 1800) return 'tier-hive-champion';
  if (rating >= 1600) return 'tier-busy-bee';
  return 'tier-newbee';
}

interface ShadowBanQueueViewProps {
  user: any;
  isAdminEnabled: boolean;
}

// Shadow Ban Queue View Component
const ShadowBanQueueView: React.FC<ShadowBanQueueViewProps> = ({ user, isAdminEnabled }) => {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showUnreviewedOnly, setShowUnreviewedOnly] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [resolutionDialogOpen, setResolutionDialogOpen] = useState(false);
  const [resolution, setResolution] = useState<'confirmed_cheat' | 'false_positive' | 'monitoring'>('monitoring');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const LIMIT = 50;

  const loadQueue = useCallback(async (pageNum = 0, append = false) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_shadow_ban_queue', {
        p_limit: LIMIT,
        p_offset: pageNum * LIMIT,
        p_unreviewed_only: showUnreviewedOnly,
      });

      if (rpcError) throw rpcError;

      const newEntries = data || [];

      if (append) {
        setQueue(prev => [...prev, ...newEntries]);
      } else {
        setQueue(newEntries);
      }

      setHasMore(newEntries.length === LIMIT);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shadow ban queue');
      console.error('Error loading shadow ban queue:', err);
    } finally {
      setLoading(false);
    }
  }, [user, showUnreviewedOnly]);

  // Hook for loadShadowBanQueue to be called from outside
  const loadShadowBanQueue = useCallback(() => loadQueue(0, false), [loadQueue]);

  useEffect(() => {
    if (isAdminEnabled) {
      loadQueue(0, false);
    }
  }, [isAdminEnabled, loadQueue]);

  const loadMore = () => {
    if (!loading && hasMore) {
      loadQueue(page + 1, true);
    }
  };

  const handleReview = (entry: any) => {
    setSelectedEntry(entry);
    setResolution('monitoring');
    setResolutionNotes('');
    setResolutionDialogOpen(true);
  };

  const handleResolve = async () => {
    if (!selectedEntry) return;

    try {
      setLoading(true);
      const { error } = await supabase.rpc('resolve_shadow_ban', {
        p_queue_id: selectedEntry.id,
        p_admin_id: user.id,
        p_resolution: resolution,
        p_notes: resolutionNotes,
      });

      if (error) throw error;

      // Reload queue
      loadQueue(page, false);
      setResolutionDialogOpen(false);
      setSelectedEntry(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve shadow ban');
      console.error('Error resolving shadow ban:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatAnomalyReasons = (reasons: string[]) => {
    if (!reasons || reasons.length === 0) return '—';
    return reasons.map(r => r.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ');
  };

  const getReasonBadge = (reason: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      high_anomaly_score: { label: '🚨 High Anomaly Score', class: 'badge-danger' },
      multiple_flags: { label: '⚠️ Multiple Flags', class: 'badge-warning' },
      device_mismatch: { label: '🔄 Device Mismatch', class: 'badge-info' },
      manual_review: { label: '👀 Manual Review', class: 'badge-secondary' },
    };
    return badges[reason] || { label: reason, class: 'badge-secondary' };
  };

  const getResolutionBadge = (res: string | null) => {
    if (!res) return <span className="badge badge-pending">⏳ Pending</span>;
    const badges: Record<string, React.ReactElement> = {
      confirmed_cheat: <span className="badge badge-danger">✅ Confirmed Cheat</span>,
      false_positive: <span className="badge badge-success">✅ False Positive</span>,
      monitoring: <span className="badge badge-warning">👁️ Monitoring</span>,
    };
    return badges[res] || <span className="badge badge-secondary">{res}</span>;
  };

  const getAnomalyScoreColor = (score: number) => {
    if (score >= 0.6) return '#ef4444'; // Red - high
    if (score >= 0.3) return '#f59e0b'; // Amber - medium
    return '#22c55e'; // Green - low
  };

  return (
    <div className="shadow-ban-queue-container">
      <div className="filters-bar">
        <label className="filter-item">
          <input
            type="checkbox"
            checked={showUnreviewedOnly}
            onChange={(e) => {
              setShowUnreviewedOnly(e.target.checked);
              setPage(0);
              loadQueue(0, false);
            }}
          />
          Show unreviewed only
        </label>
      </div>

      {error && (
        <div className="admin-error">
          <p>{error}</p>
          <button onClick={loadShadowBanQueue}>Retry</button>
        </div>
      )}

      {loading && queue.length === 0 && (
        <div className="admin-loading">Loading shadow ban queue...</div>
      )}

      {queue.length === 0 && !loading && !error && (
        <div className="admin-empty">
          <p>No shadow ban queue entries found.</p>
        </div>
      )}

      <div className="logs-table-container">
        <table className="logs-table">
          <thead>
            <tr>
              <th>Time Flagged</th>
              <th>Player</th>
              <th>Reason</th>
              <th>Anomaly Score</th>
              <th>Resolution</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {queue.map(entry => (
              <tr key={entry.id} className={!entry.reviewed_at ? 'unreviewed-row' : ''}>
                <td className="timestamp">{formatDate(entry.flagged_at)}</td>
                <td className="player">
                  <img
                    src={entry.avatar_url || '/default-avatar.png'}
                    alt={entry.username || 'Player'}
                    className="avatar-sm"
                  />
                  <span>{entry.username || entry.user_id.slice(0, 8)}</span>
                </td>
                <td className="reason">
                  <span className={`badge ${getReasonBadge(entry.reason).class}`}>
                    {getReasonBadge(entry.reason).label}
                  </span>
                </td>
                <td className="anomaly-score">
                  <div
                    className="anomaly-bar"
                    style={{ width: `${entry.anomaly_score * 100}%`, backgroundColor: getAnomalyScoreColor(entry.anomaly_score) }}
                  >
                    {Math.round(entry.anomaly_score * 100)}%
                  </div>
                </td>
                <td className="resolution">{getResolutionBadge(entry.resolution)}</td>
                <td className="actions">
                  {!entry.reviewed_at && (
                    <button
                      className="review-btn"
                      onClick={() => handleReview(entry)}
                    >
                      Review
                    </button>
                  )}
                  {entry.reviewed_at && (
                    <span className="reviewed-by">
                      Reviewed {formatDate(entry.reviewed_at)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <button className="load-more-btn" onClick={loadMore} disabled={loading}>
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}

      {/* Resolution Dialog */}
      {resolutionDialogOpen && selectedEntry && (
        <div className="modal-overlay" onClick={() => setResolutionDialogOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Resolve Shadow Ban Entry</h3>
            <p><strong>Player:</strong> {selectedEntry.username || selectedEntry.user_id.slice(0, 8)}</p>
            <p><strong>Reason:</strong> {formatAnomalyReasons([selectedEntry.reason])}</p>
            <p><strong>Anomaly Score:</strong> {Math.round(selectedEntry.anomaly_score * 100)}%</p>
            <p><strong>Flagged:</strong> {formatDate(selectedEntry.flagged_at)}</p>

            <div className="form-group">
              <label>Resolution:</label>
              <select
                value={resolution}
                onChange={e => setResolution(e.target.value as any)}
                className="resolution-select"
              >
                <option value="monitoring">👁️ Monitoring (keep in shadow pool)</option>
                <option value="false_positive">✅ False Positive (remove from shadow pool)</option>
                <option value="confirmed_cheat">🚫 Confirmed Cheat (permanent action)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Notes (optional):</label>
              <textarea
                value={resolutionNotes}
                onChange={e => setResolutionNotes(e.target.value)}
                rows={3}
                placeholder="Add any notes about this decision..."
              />
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setResolutionDialogOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleResolve}
                disabled={loading}
              >
                {loading ? 'Resolving...' : 'Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;