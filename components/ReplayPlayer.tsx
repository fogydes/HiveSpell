import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useReplay } from '../hooks/useReplay';
import type { GameReplay, ReplayTimelineEvent, ReplayEventType } from '../types/multiplayer';

interface ReplayPlayerProps {
  replayId?: number;
  roomId?: string;
  onClose?: () => void;
}

const EVENT_TYPE_LABELS: Record<ReplayEventType, string> = {
  game_start: 'Game Started',
  turn_start: 'Turn Started',
  turn_end: 'Turn Ended',
  word_spoken: 'Word Spoken',
  word_correct: '✓ Correct',
  word_incorrect: '✗ Incorrect',
  player_eliminated: 'Eliminated',
  game_end: 'Game Ended',
};

const EVENT_TYPE_COLORS: Record<ReplayEventType, string> = {
  game_start: '#22c55e',
  turn_start: '#3b82f6',
  turn_end: '#6366f1',
  word_spoken: '#f59e0b',
  word_correct: '#22c55e',
  word_incorrect: '#ef4444',
  player_eliminated: '#ef4444',
  game_end: '#a855f7',
};

const PLAYBACK_SPEEDS = [0.5, 1, 2, 4];

export const ReplayPlayer: React.FC<ReplayPlayerProps> = ({
  replayId,
  roomId,
  onClose,
}) => {
  const {
    playbackState,
    loading,
    error,
    loadReplay,
    loadReplayByRoom,
    play,
    pause,
    seek,
    setPlaybackSpeed,
    stepForward,
    stepBackward,
    reset,
    getCurrentEvent,
    formatTime,
  } = useReplay({ replayId, roomId, autoLoad: true });

  const { replay, timeline, currentEventIndex, isPlaying, playbackSpeed, currentTimeMs, totalDurationMs } = playbackState;

  const [showTimeline, setShowTimeline] = useState(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Current event for display
  const currentEvent = getCurrentEvent();

  // Reset playback when replay changes
  useEffect(() => {
    if (replay) {
      reset();
    }
  }, [replay?.id, reset]);

  if (loading) {
    return (
      <div className="replay-player loading">
        <div className="replay-loading-spinner"></div>
        <p>Loading replay...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="replay-player error">
        <h3>Error Loading Replay</h3>
        <p>{error}</p>
        <button onClick={() => replayId ? loadReplay(replayId) : roomId && loadReplayByRoom(roomId)}>
          Retry
        </button>
        {onClose && <button onClick={onClose}>Close</button>}
      </div>
    );
  }

  if (!replay) {
    return (
      <div className="replay-player empty">
        <p>No replay data available</p>
        {onClose && <button onClick={onClose}>Close</button>}
      </div>
    );
  }

  const progress = totalDurationMs > 0 ? (currentTimeMs / totalDurationMs) * 100 : 0;
  const players = useMemo(() => {
    const playerMap = new Map<string, { username: string; avatar_url: string | null; color: string }>();
    timeline.forEach(event => {
      if (event.player_id && !playerMap.has(event.player_id)) {
        const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4', '#84cc16'];
        const colorIndex = playerMap.size % colors.length;
        playerMap.set(event.player_id, {
          username: event.player_username || 'Unknown',
          avatar_url: event.player_avatar_url,
          color: colors[colorIndex],
        });
      }
    });
    return Array.from(playerMap.entries()).map(([id, data]) => ({ id, ...data }));
  }, [timeline]);

  const filteredTimeline = selectedPlayerId
    ? timeline.filter(e => e.player_id === selectedPlayerId)
    : timeline;

  const handleSeek = (percentage: number) => {
    const targetTime = (percentage / 100) * totalDurationMs;
    const index = timeline.findIndex(e => e.timestamp_ms > targetTime);
    if (index === -1) {
      seek(timeline.length - 1);
    } else if (index > 0) {
      seek(index - 1);
    } else {
      seek(0);
    }
  };

  const getEventIcon = (eventType: ReplayEventType) => {
    switch (eventType) {
      case 'game_start': return '🎮';
      case 'turn_start': return '▶️';
      case 'turn_end': return '⏹️';
      case 'word_spoken': return '🎤';
      case 'word_correct': return '✅';
      case 'word_incorrect': return '❌';
      case 'player_eliminated': return '💀';
      case 'game_end': return '🏁';
      default: return '📌';
    }
  };

  const formatFullTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="replay-player">
      {/* Header */}
      <div className="replay-header">
        <div className="replay-info">
          <h2 className="replay-title">
            {replay.is_ranked ? '🏆 Ranked ' : ''}Replay
          </h2>
          <div className="replay-meta">
            <span>Mode: <strong>{replay.mode}</strong></span>
            <span>Players: <strong>{replay.total_players}</strong></span>
            <span>Duration: <strong>{formatFullTime(replay.game_duration_ms || 0)}</strong></span>
            {replay.winner_username && (
              <span className="replay-winner">🏆 Winner: <strong>{replay.winner_username}</strong></span>
            )}
            <span>Date: <strong>{new Date(replay.started_at).toLocaleDateString()}</strong></span>
          </div>
        </div>
        {onClose && (
          <button className="replay-close-btn" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      {/* Playback Controls */}
      <div className="replay-controls">
        <div className="progress-bar-container" onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const percent = ((e.clientX - rect.left) / rect.width) * 100;
          handleSeek(percent);
        }}>
          <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          <div className="progress-bar-handle" style={{ left: `${progress}%` }}></div>
        </div>
        <div className="time-display">
          <span>{formatFullTime(currentTimeMs)}</span>
          <span>/</span>
          <span>{formatFullTime(totalDurationMs)}</span>
        </div>
        <div className="playback-buttons">
          <button onClick={reset} title="Restart" disabled={currentEventIndex <= 0}>
            ⏮
          </button>
          <button onClick={stepBackward} title="Previous Event" disabled={currentEventIndex <= 0}>
            ⏪
          </button>
          {isPlaying ? (
            <button onClick={pause} title="Pause" className="play-btn">
              ⏸
            </button>
          ) : (
            <button onClick={play} title="Play" className="play-btn">
              ▶️
            </button>
          )}
          <button onClick={stepForward} title="Next Event" disabled={currentEventIndex >= timeline.length - 1}>
            ⏩
          </button>
          <button onClick={() => seek(timeline.length - 1)} title="Jump to End">
            ⏭
          </button>
        </div>
        <div className="speed-control">
          <label>Speed:</label>
          <select value={playbackSpeed} onChange={e => setPlaybackSpeed(Number(e.target.value))}>
            {PLAYBACK_SPEEDS.map(speed => (
              <option key={speed} value={speed}>{speed}x</option>
            ))}
          </select>
        </div>
      </div>

      {/* Current Event Display */}
      {currentEvent && (
        <div className="replay-current-event" style={{ borderLeftColor: EVENT_TYPE_COLORS[currentEvent.event_type] }}>
          <div className="event-header">
            <span className="event-icon">{getEventIcon(currentEvent.event_type)}</span>
            <span className="event-type" style={{ color: EVENT_TYPE_COLORS[currentEvent.event_type] }}>
              {EVENT_TYPE_LABELS[currentEvent.event_type]}
            </span>
            <span className="event-time">{formatFullTime(currentEvent.timestamp_ms)}</span>
          </div>
          {currentEvent.player_id && (
            <div className="event-player">
              {currentEvent.player_avatar_url && (
                <img src={currentEvent.player_avatar_url} alt="" className="event-avatar" />
              )}
              <span className="event-player-name">{currentEvent.player_username}</span>
            </div>
          )}
          {currentEvent.word && (
            <div className="event-word">
              Word: <strong>"{currentEvent.word}"</strong>
            </div>
          )}
          {currentEvent.wpm && (
            <div className="event-wpm">
              WPM: <strong>{currentEvent.wpm}</strong>
            </div>
          )}
          {currentEvent.time_taken_ms && (
            <div className="event-duration">
              Time: <strong>{formatFullTime(currentEvent.time_taken_ms)}</strong>
            </div>
          )}
          {currentEvent.streak !== null && currentEvent.streak > 0 && (
            <div className="event-streak">
              Streak: <strong>{currentEvent.streak}</strong>
            </div>
          )}
        </div>
      )}

      {/* Timeline/Event List */}
      {showTimeline && (
        <div className="replay-timeline">
          <div className="timeline-header">
            <h3>Event Timeline ({timeline.length} events)</h3>
            <div className="timeline-filters">
              <label>
                <input
                  type="checkbox"
                  checked={!!selectedPlayerId}
                  onChange={e => setSelectedPlayerId(e.target.checked ? players[0]?.id || null : null)}
                />
                Show all players
              </label>
              {players.length > 0 && (
                <select
                  value={selectedPlayerId || ''}
                  onChange={e => setSelectedPlayerId(e.target.value || null)}
                >
                  <option value="">All Players</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id} style={{ borderLeft: `3px solid ${p.color}` }}>
                      {p.username}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="timeline-events">
            {filteredTimeline.map((event, index) => (
              <button
                key={event.sequence_num}
                className={`timeline-event ${currentEventIndex === index ? 'current' : ''}`}
                onClick={() => seek(index)}
                style={{
                  borderLeftColor: EVENT_TYPE_COLORS[event.event_type],
                }}
              >
                <div className="event-main">
                  <span className="event-icon">{getEventIcon(event.event_type)}</span>
                  <span className="event-type">{EVENT_TYPE_LABELS[event.event_type]}</span>
                  <span className="event-time">{formatFullTime(event.timestamp_ms)}</span>
                </div>
                <div className="event-details">
                  {event.player_id && (
                    <>
                      {event.player_avatar_url && (
                        <img src={event.player_avatar_url} alt="" className="event-avatar" />
                      )}
                      <span className="event-player-name" style={{ color: players.find(p => p.id === event.player_id)?.color }}>
                        {event.player_username}
                      </span>
                    </>
                  )}
                  {event.word && <span className="event-word">"{event.word}"</span>}
                  {event.wpm && <span className="event-wpm">{event.wpm} WPM</span>}
                  {event.streak !== null && event.streak > 0 && <span className="event-streak">Streak: {event.streak}</span>}
                </div>
              </button>
            ))}
            {filteredTimeline.length === 0 && (
              <div className="timeline-empty">No events to display</div>
            )}
          </div>
        </div>
      )}

      {/* Player Stats Panel */}
      {players.length > 0 && (
        <div className="replay-player-stats">
          <h3>Final Stats</h3>
          <div className="player-stats-grid">
            {players.map(player => {
              const stats = replay.player_stats[player.id];
              return (
                <div key={player.id} className="player-stat-card" style={{ borderTopColor: player.color }}>
                  <div className="player-stat-header">
                    {player.avatar_url && <img src={player.avatar_url} alt="" className="player-stat-avatar" />}
                    <span className="player-stat-name">{player.username}</span>
                    {player.id === replay.winner_id && <span className="winner-badge">🏆</span>}
                  </div>
                  {stats && (
                    <div className="player-stat-values">
                      <div className="stat-row">
                        <span>Correct:</span>
                        <span>{stats.correct_words}</span>
                      </div>
                      <div className="stat-row">
                        <span>Incorrect:</span>
                        <span>{stats.incorrect_words}</span>
                      </div>
                      <div className="stat-row">
                        <span>Avg WPM:</span>
                        <span>{stats.total_wpm > 0 ? Math.round(stats.total_wpm / Math.max(1, stats.correct_words)) : 0}</span>
                      </div>
                      <div className="stat-row">
                        <span>Max Streak:</span>
                        <span>{stats.max_streak}</span>
                      </div>
                      <div className="stat-row">
                        <span>Rank:</span>
                        <span>#{stats.final_rank}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReplayPlayer;