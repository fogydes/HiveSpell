// Phase 4d: Multi-dimension Leaderboards - UI Components

import React, { useState, useEffect, useMemo } from 'react';
import {
  LeaderboardEntry,
  GlobalLeaderboardEntry,
  FriendsLeaderboardEntry,
  DailyLeaderboardEntry,
  ModeLeaderboardEntry,
  LeaderboardPage,
  LeaderboardType,
  GameMode,
  PlayerRankInfo,
  LEADERBOARD_TABS,
  GAME_MODES,
  GAME_MODE_LABELS,
  formatRank,
  formatScore,
  formatWpm,
  getModeLabel,
  getRankEmoji,
  isTopThree,
} from '../../utils/leaderboards';
import { useScene } from "@/context/SceneContext";
import { useReduceMotion } from "@/hooks/useAccessibility";

// ============================================================
// Tier Badge Component (reused from battle pass / profile)
// ============================================================

export function getTierColor(tier: string): string {
  const TIER_COLORS: Record<string, string> = {
    Bronze: '#CD7F32',
    Silver: '#C0C0C0',
    Gold: '#FFD700',
    Platinum: '#E5E4E2',
    Diamond: '#B9F2FF',
    Queen: '#FF00FF',
  };
  return TIER_COLORS[tier] || '#64748b';
}

export function getTierGlow(tier: string): string {
  const TIER_GLOWS: Record<string, string> = {
    Bronze: '#CD7F32',
    Silver: '#C0C0C0',
    Gold: '#FFD700',
    Platinum: '#E5E4E2',
    Diamond: '#B9F2FF',
    Queen: '#FF00FF',
  };
  return TIER_GLOWS[tier] || '#64748b';
}

interface TierBadgeProps {
  tier: string;
  size?: 'sm' | 'md' | 'lg';
  showGlow?: boolean;
}

export const TierBadge: React.FC<TierBadgeProps> = ({ tier, size = 'md', showGlow = false }) => {
  const tierColor = getTierColor(tier);
  const tierGlow = getTierGlow(tier);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  const glowStyles = showGlow
    ? {
        boxShadow: `0 0 12px ${tierGlow}60, inset 0 0 20px ${tierGlow}20`,
        borderColor: tierColor,
      }
    : {
        borderColor: `${tierColor}60`,
      };

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-full border ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${tierColor}20`,
        color: tierColor,
        ...glowStyles,
      }}
    >
      {tier}
    </span>
  );
};

// ============================================================
// Avatar Component
// ============================================================

interface LeaderboardAvatarProps {
  username: string;
  avatarUrl: string | null;
  tier: string;
  size?: number;
  rank?: number;
}

export const LeaderboardAvatar: React.FC<LeaderboardAvatarProps> = ({
  username,
  avatarUrl,
  tier,
  size = 40,
  rank,
}) => {
  const tierColor = getTierColor(tier);
  const isTop3 = rank && isTopThree(rank);

  if (avatarUrl) {
    return (
      <div
        className="relative flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <img
          src={avatarUrl}
          alt={username}
          className="w-full h-full rounded-full object-cover border-2"
          style={{ borderColor: isTop3 ? tierColor : 'transparent' }}
        />
        {isTop3 && (
          <div
            className="absolute -bottom-1 -right-1 flex items-center justify-center"
            style={{
              width: size * 0.35,
              height: size * 0.35,
              backgroundColor: tierColor,
              borderRadius: '50%',
              border: `2px solid #0f172a`,
            }}
          >
            <span style={{ fontSize: size * 0.2 }}>{getRankEmoji(rank!)}</span>
          </div>
        )}
      </div>
    );
  }

  // Fallback: initials with tier color background
  const initials = username
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="relative flex-shrink-0 flex items-center justify-center font-bold text-white rounded-full"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${tierColor}, ${tierColor}dd)`,
        fontSize: size * 0.35,
        border: isTop3 ? `3px solid ${tierColor}` : 'none',
      }}
    >
      {initials}
      {isTop3 && (
        <div
          className="absolute -bottom-1 -right-1 flex items-center justify-center"
          style={{
            width: size * 0.35,
            height: size * 0.35,
            backgroundColor: tierColor,
            borderRadius: '50%',
            border: `2px solid #0f172a`,
          }}
        >
          <span style={{ fontSize: size * 0.2 }}>{getRankEmoji(rank!)}</span>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Leaderboard Row Component
// ============================================================

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  index: number;
  highlightCurrentUser?: boolean;
}

export const LeaderboardRow: React.FC<LeaderboardRowProps> = ({
  entry,
  index,
  highlightCurrentUser = true,
}) => {
  const isCurrentUser = entry.isCurrentUser && highlightCurrentUser;
  const rank = entry.rank || index + 1;
  const tierColor = getTierColor(entry.tier);

  const getStatsDisplay = () => {
    switch (entry.type) {
      case 'global':
        return (
          <div className="flex items-center gap-4 text-sm text-slate-400 hidden md:flex">
            <span className="flex items-center gap-1">
              <span className="text-amber-400">★</span>
              {((entry as GlobalLeaderboardEntry).gamesWon || 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-green-400">✓</span>
              {((entry as GlobalLeaderboardEntry).totalCorrectWords || 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-yellow-400">🍯</span>
              {((entry as GlobalLeaderboardEntry).lifetimeNectar || 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-orange-400">🔥</span>
              {((entry as GlobalLeaderboardEntry).maxStreak || 0).toLocaleString()}
            </span>
          </div>
        );
      case 'friends':
        return (
          <div className="flex items-center gap-4 text-sm text-slate-400 hidden md:flex">
            <span className="flex items-center gap-1">
              <span className="text-amber-400">★</span>
              {((entry as FriendsLeaderboardEntry).gamesWon || 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-green-400">✓</span>
              {((entry as FriendsLeaderboardEntry).totalCorrectWords || 0).toLocaleString()}
            </span>
          </div>
        );
      case 'daily':
        return (
          <div className="flex items-center gap-4 text-sm text-slate-400 hidden md:flex">
            <span className="flex items-center gap-1">
              <span className="text-amber-400">★</span>
              {(entry as DailyLeaderboardEntry).dailyWins}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-green-400">✓</span>
              {(entry as DailyLeaderboardEntry).dailyCorrectWords}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-yellow-400">✨</span>
              {(entry as DailyLeaderboardEntry).dailyXp.toLocaleString()} XP
            </span>
          </div>
        );
      case 'mode':
        return (
          <div className="flex items-center gap-4 text-sm text-slate-400 hidden md:flex">
            <span className="flex items-center gap-1">
              <span className="text-amber-400">★</span>
              {(entry as ModeLeaderboardEntry).gamesWon}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-green-400">✓</span>
              {(entry as ModeLeaderboardEntry).totalCorrectWords}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-cyan-400">⚡</span>
              {formatWpm((entry as ModeLeaderboardEntry).bestWpm)}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-orange-400">🔥</span>
              {(entry as ModeLeaderboardEntry).maxStreak}
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  const backgroundStyle = isCurrentUser
    ? {
        background: `linear-gradient(90deg, ${tierColor}15, transparent)`,
        borderColor: `${tierColor}40`,
      }
    : {};

  return (
    <div
      className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        isCurrentUser
          ? 'border ring-1 ring-offset-2 ring-offset-slate-950'
          : 'border-slate-700/50 hover:border-slate-600'
      } group`}
      style={{
        backgroundColor: isCurrentUser ? `${tierColor}10` : 'rgba(30, 41, 59, 0.8)',
        ...backgroundStyle,
      }}
    >
      {/* Rank */}
      <div className="flex-shrink-0 w-14 text-center">
        {isTopThree(rank) ? (
          <span className="text-2xl" aria-label={`Rank ${rank}`}>
            {getRankEmoji(rank)}
          </span>
        ) : (
          <span className="font-mono font-bold text-slate-400 text-lg">#{rank}</span>
        )}
      </div>

      {/* Avatar & Name */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <LeaderboardAvatar
          username={entry.username}
          avatarUrl={entry.avatarUrl}
          tier={entry.tier}
          size={44}
          rank={rank}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white truncate">{entry.username}</span>
            {isCurrentUser && (
              <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                You
              </span>
            )}
          </div>
          <TierBadge tier={entry.tier} size="sm" />
        </div>
      </div>

      {/* Stats */}
      <div className="hidden lg:block w-56 text-right">
        {getStatsDisplay()}
      </div>

      {/* Score */}
      <div className="flex-shrink-0 w-28 text-right">
        <span className="font-mono font-bold text-lg" style={{ color: tierColor }}>
          {formatScore(
            entry.type === 'global' || entry.type === 'friends'
              ? (entry as GlobalLeaderboardEntry | FriendsLeaderboardEntry).compositeScore
              : entry.type === 'daily'
                ? (entry as DailyLeaderboardEntry).dailyXp
                : (entry as ModeLeaderboardEntry).modeScore
          )}
        </span>
      </div>
    </div>
  );
};

// ============================================================
// Leaderboard Table Component
// ============================================================

interface LeaderboardTableProps {
  title: string;
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  emptyMessage: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  highlightedUserId?: string;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  title,
  entries,
  loading,
  error,
  emptyMessage,
  onLoadMore,
  hasMore,
  highlightedUserId,
}) => {
  const [showLoadMore, setShowLoadMore] = useState(false);

  useEffect(() => {
    if (hasMore && !loading && entries.length > 0) {
      setShowLoadMore(true);
    }
  }, [hasMore, loading, entries.length]);

  if (loading && entries.length === 0) {
    return (
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 animate-pulse" />
            <div className="h-6 w-48 bg-slate-700 rounded animate-pulse" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-700/50 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800/60 border border-red-500/30 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 bg-red-500/20 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-red-400 mb-2">{error}</p>
        <button
          onClick={onLoadMore}
          className="px-4 py-2 bg-amber-500 text-slate-900 font-bold rounded-lg hover:bg-amber-400 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 bg-slate-700 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <p className="text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-900/50">
        <h3 className="font-bold text-white flex items-center gap-2">
          {title}
        </h3>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-700/30">
        {entries.map((entry, index) => (
          <LeaderboardRow
            key={entry.userId}
            entry={entry}
            index={index}
            highlightCurrentUser={!!highlightedUserId}
          />
        ))}
      </div>

      {/* Load More */}
      {showLoadMore && onLoadMore && (
        <div className="px-4 py-4 border-t border-slate-700/50">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="w-full py-3 bg-slate-700/50 text-slate-300 font-medium rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-amber-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </span>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Player Rank Summary Card
// ============================================================

interface PlayerRankCardProps {
  rank: PlayerRankInfo;
  onClick?: () => void;
}

export const PlayerRankCard: React.FC<PlayerRankCardProps> = ({ rank, onClick }) => {
  const tier = rank.score >= 50000 ? 'Queen' : rank.score >= 25000 ? 'Diamond' : rank.score >= 10000 ? 'Platinum' : rank.score >= 5000 ? 'Gold' : rank.score >= 1000 ? 'Silver' : 'Bronze';
  const tierColor = getTierColor(tier);
  const tierGlow = getTierGlow(tier);

  const getLabel = () => {
    switch (rank.leaderboardType) {
      case 'global': return 'Global Rank';
      case 'friends': return 'Friends Rank';
      case 'daily': return 'Daily Rank';
      case 'mode': return `${rank.metadata?.mode || 'Mode'} Rank`;
      default: return 'Rank';
    }
  };

  return (
    <button
      onClick={onClick}
      className="relative group flex flex-col items-center p-4 rounded-2xl bg-slate-800/60 border border-slate-700 hover:border-amber-500/50 transition-all duration-300 overflow-hidden"
      style={{
        boxShadow: `0 0 20px ${tierGlow}20`,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent group-hover:from-amber-500/10 transition-all duration-500" />

      <div className="relative z-10 text-center">
        <TierBadge tier={tier} size="lg" showGlow />
        <p className="text-xs text-slate-400 uppercase tracking-wide mt-2">{getLabel()}</p>
        <p className="font-bold text-white text-3xl mt-1">{formatRank(rank.rank)}</p>
        <p className="text-sm text-slate-500 mt-1">Top {Math.round((rank.rank / rank.totalPlayers) * 100)}%</p>
        <p className="text-xs text-slate-500 mt-2">of {rank.totalPlayers.toLocaleString()} players</p>
      </div>
    </button>
  );
};

// ============================================================
// Player Rank Summary Bar (for Home screen)
// ============================================================

export const PlayerRankSummary: React.FC<{
  ranks: PlayerRankInfo[];
  onClick: () => void;
}> = ({ ranks, onClick }) => {
  if (ranks.length === 0) {
    return (
      <button
        onClick={onClick}
        className="w-full group relative rounded-2xl p-4 bg-gradient-to-r from-slate-800/80 to-slate-900/80 border border-slate-700 hover:border-amber-500/50 transition-all duration-300"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <span className="text-xl">🏆</span>
          </div>
          <div className="text-left flex-1">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Leaderboards</p>
            <p className="font-bold text-white">Play to rank!</p>
          </div>
        </div>
        <div className="relative mt-3 flex items-center justify-center gap-2 text-slate-400 text-sm">
          <span>View leaderboards →</span>
          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    );
  }

  const topRanks = ranks.slice(0, 3);

  return (
    <button
      onClick={onClick}
      className="w-full group relative rounded-2xl p-4 bg-gradient-to-r from-slate-800/80 to-slate-900/80 border border-slate-700 hover:border-amber-500/50 transition-all duration-300 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <span className="text-xl">🏆</span>
          </div>
          <div className="text-left">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Your Ranks</p>
            <div className="flex items-center gap-2 mt-1">
              {topRanks.map((rank) => {
                const tier = rank.score >= 50000 ? 'Queen' : rank.score >= 25000 ? 'Diamond' : rank.score >= 10000 ? 'Platinum' : rank.score >= 5000 ? 'Gold' : rank.score >= 1000 ? 'Silver' : 'Bronze';
                const tierColor = getTierColor(tier);
                return (
                  <span
                    key={rank.leaderboardType}
                    className="px-2 py-1 text-xs font-bold rounded-full"
                    style={{
                      backgroundColor: `${tierColor}20`,
                      color: tierColor,
                      border: `1px solid ${tierColor}40`,
                    }}
                  >
                    {formatRank(rank.rank)}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <span>View all →</span>
          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
};

// ============================================================
// Leaderboard Tabs
// ============================================================

interface LeaderboardTabsProps {
  activeTab: LeaderboardType;
  onTabChange: (tab: LeaderboardType) => void;
  userId: string | null;
  currentMode: GameMode | null;
  onModeChange: (mode: GameMode) => void;
}

export const LeaderboardTabs: React.FC<LeaderboardTabsProps> = ({
  activeTab,
  onTabChange,
  userId,
  currentMode,
  onModeChange,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 pb:no-scrollbar">
      {LEADERBOARD_TABS
        .filter((tab) => {
          if (tab.requiresAuth && !userId) return false;
          return true;
        })
        .map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-lg shadow-amber-500/30'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/50 border border-slate-700'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}

      {/* Mode selector when on mode tab */}
      {activeTab === 'mode' && (
        <div className="flex-shrink-0 ml-2 flex items-center gap-2">
          <select
            value={currentMode || 'medium'}
            onChange={(e) => onModeChange(e.target.value as GameMode)}
            className="bg-slate-800/60 border border-slate-700 text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none"
          >
            {GAME_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {getModeLabel(mode)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Mode Selector Pills (for Mode tab)
// ============================================================

interface ModeSelectorProps {
  currentMode: GameMode;
  onModeChange: (mode: GameMode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onModeChange }) => {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Select game mode">
      {GAME_MODES.map((mode) => (
        <button
          key={mode}
          onClick={() => onModeChange(mode)}
          className={`px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${
            currentMode === mode
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-lg shadow-amber-500/30'
              : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/50 border border-slate-700'
          }`}
          role="radio"
          aria-checked={currentMode === mode}
        >
          {getModeLabel(mode)}
        </button>
      ))}
    </div>
  );
};