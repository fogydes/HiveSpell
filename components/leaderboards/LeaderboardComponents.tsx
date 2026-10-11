// Phase 4d: Multi-dimension Leaderboards - UI Components
//
// Transformation V2 (#28): podium redesign. Top-3 get a real trophy podium
// (pedestals with place-colour glow + height hierarchy), rank 4+ render as a
// themed ranked list that staggers in on load, and the viewer's own rank pins
// to the bottom of the viewport. All colours use the app's design tokens so the
// view matches the transformed Home / Play / Auth screens; per-place trophy
// colours (gold / silver / bronze) and per-tier accent colours are intentional
// brand colours kept as literals.
//
// NOTE (sparkline directive): the spec also asks for a per-player score-history
// sparkline. The leaderboard RPCs (get_global/friends/daily/mode_leaderboard)
// return only current scalar snapshots — there is no per-player score-history
// series in the data model, and ranked_match_history is a separate, self-scoped
// ELO feature. Rather than fabricate a trend from a single value (see the Home
// live-count honesty decision), the sparkline is deferred until a real
// score-history source exists. See docs/transformationV2.md.

import React, { useRef } from 'react';
import {
  LeaderboardEntry,
  GlobalLeaderboardEntry,
  FriendsLeaderboardEntry,
  DailyLeaderboardEntry,
  ModeLeaderboardEntry,
  LeaderboardType,
  GameMode,
  LEADERBOARD_TABS,
  GAME_MODES,
  getModeLabel,
  formatRank,
  formatScore,
  formatWpm,
  getRankEmoji,
  isTopThree,
  getTierFromScore,
} from '../../utils/leaderboards';
import { useScene } from "@/context/SceneContext";
import { useReduceMotion } from "@/hooks/useAccessibility";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

// ============================================================
// Tier colours (per-tier brand accents — intentionally literal)
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

/** Motion gate shared by all animated leaderboard components — matches the
 * Play/Home convention (static tier or OS reduce-motion → still UI). */
function useDisableAnimations(): boolean {
  const { performanceTier } = useScene();
  const reduceMotion = useReduceMotion();
  return performanceTier === "static" || reduceMotion;
}

// ============================================================
// Tier Badge Component
// ============================================================

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
// Avatar Component (tier-ringed; medal shown only when a rank is passed)
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
  const isTop3 = rank ? isTopThree(rank) : false;

  if (avatarUrl) {
    return (
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <img
          src={avatarUrl}
          alt={username}
          className="w-full h-full rounded-full object-cover border-2"
          style={{ borderColor: isTop3 ? tierColor : `${tierColor}55` }}
        />
        {isTop3 && (
          <div
            className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full"
            style={{
              width: size * 0.35,
              height: size * 0.35,
              backgroundColor: tierColor,
              border: `2px solid var(--bg-app, #0f172a)`,
            }}
          >
            <span style={{ fontSize: size * 0.2 }}>{getRankEmoji(rank!)}</span>
          </div>
        )}
      </div>
    );
  }

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
        border: isTop3 ? `3px solid ${tierColor}` : `2px solid ${tierColor}55`,
      }}
    >
      {initials}
      {isTop3 && (
        <div
          className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full"
          style={{
            width: size * 0.35,
            height: size * 0.35,
            backgroundColor: tierColor,
            border: `2px solid var(--color-bg-app, #0f172a)`,
          }}
        >
          <span style={{ fontSize: size * 0.2 }}>{getRankEmoji(rank!)}</span>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Score helper (shared by podium / rows / pinned bar)
// ============================================================

function entryScore(entry: LeaderboardEntry): number {
  switch (entry.type) {
    case 'global':
    case 'friends':
      return (entry as GlobalLeaderboardEntry | FriendsLeaderboardEntry).compositeScore;
    case 'daily':
      return (entry as DailyLeaderboardEntry).dailyXp;
    case 'mode':
      return (entry as ModeLeaderboardEntry).modeScore;
    default:
      return 0;
  }
}

// ============================================================
// Trophy Podium (top 3)
// ============================================================

interface PodiumPlace {
  color: string;
  glow: string;
  icon: string;
  pedestal: string;
  avatar: number;
}

// Trophy podium uses place colours (gold / silver / bronze), not tier colours —
// place is what the podium communicates.
const PODIUM_PLACES: Record<number, PodiumPlace> = {
  1: { color: '#FFD700', glow: 'rgba(255,215,0,0.45)', icon: '🏆', pedestal: 'h-24 sm:h-28', avatar: 76 },
  2: { color: '#C0C0C0', glow: 'rgba(192,192,192,0.40)', icon: '🥈', pedestal: 'h-16 sm:h-20', avatar: 60 },
  3: { color: '#CD7F32', glow: 'rgba(205,127,50,0.40)', icon: '🥉', pedestal: 'h-12 sm:h-16', avatar: 60 },
};

interface LeaderboardPodiumProps {
  entries: LeaderboardEntry[]; // ranks 1..3, sorted ascending
  highlightedUserId?: string;
  disableAnimations: boolean;
}

const LeaderboardPodium: React.FC<LeaderboardPodiumProps> = ({
  entries,
  highlightedUserId,
  disableAnimations,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);

  const byRank = (r: number) => entries.find((e) => e.rank === r);
  // Classic podium ordering: runner-up | champion | third.
  const columns = [byRank(2), byRank(1), byRank(3)].filter(Boolean) as LeaderboardEntry[];

  useGSAP(
    () => {
      if (disableAnimations || !rootRef.current) return;
      const items = gsap.utils.toArray<HTMLElement>("[data-podium-item]", rootRef.current);
      gsap.from(items, { opacity: 0, y: 28, duration: 0.5, stagger: 0.12, ease: "back.out(1.6)" });
      const pedestals = gsap.utils.toArray<HTMLElement>("[data-pedestal]", rootRef.current);
      gsap.from(pedestals, {
        scaleY: 0,
        transformOrigin: "bottom",
        duration: 0.5,
        stagger: 0.12,
        ease: "power3.out",
      });
    },
    { dependencies: [entries.map((e) => e.userId).join(","), disableAnimations], scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      className="rounded-2xl border border-[var(--theme-border-strong)] bg-panel/40 p-4 backdrop-blur-sm sm:p-6"
    >
      <div className="flex items-end justify-center gap-2 sm:gap-4">
        {columns.map((entry) => {
          const place = PODIUM_PLACES[entry.rank] ?? PODIUM_PLACES[3];
          const isYou = !!highlightedUserId && entry.userId === highlightedUserId;
          return (
            <div
              key={entry.userId}
              data-podium-item
              className="flex w-1/3 max-w-[9rem] flex-col items-center"
            >
              {/* Trophy / medal */}
              <div
                className="mb-1 text-2xl sm:text-3xl"
                style={{ filter: `drop-shadow(0 0 6px ${place.glow})` }}
                aria-hidden="true"
              >
                {place.icon}
              </div>

              {/* Avatar with place-colour ring */}
              <div
                className="relative rounded-full"
                style={{ boxShadow: `0 0 0 3px ${place.color}, 0 0 20px ${place.glow}` }}
              >
                <LeaderboardAvatar
                  username={entry.username}
                  avatarUrl={entry.avatarUrl}
                  tier={entry.tier}
                  size={place.avatar}
                />
              </div>

              {/* Identity */}
              <div className="mt-2 w-full text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="truncate text-xs font-bold text-text-main sm:text-sm">
                    {entry.username}
                  </span>
                  {isYou && (
                    <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      You
                    </span>
                  )}
                </div>
                <div className="mt-1 flex justify-center">
                  <TierBadge tier={entry.tier} size="sm" />
                </div>
                <div className="mt-1 font-mono text-sm font-black" style={{ color: place.color }}>
                  {formatScore(entryScore(entry))}
                </div>
              </div>

              {/* Pedestal */}
              <div
                data-pedestal
                className={`mt-3 flex w-full ${place.pedestal} items-start justify-center rounded-t-xl border-x border-t`}
                style={{
                  borderColor: `${place.color}55`,
                  background: `linear-gradient(to bottom, ${place.color}33, ${place.color}0d)`,
                }}
              >
                <span className="mt-2 text-2xl font-black sm:text-3xl" style={{ color: place.color }}>
                  {entry.rank}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================
// Leaderboard Row (rank 4+)
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
          <div className="hidden items-center gap-4 text-sm text-text-muted md:flex">
            <span className="flex items-center gap-1"><span className="text-amber-400">★</span>{((entry as GlobalLeaderboardEntry).gamesWon || 0).toLocaleString()}</span>
            <span className="flex items-center gap-1"><span className="text-emerald-400">✓</span>{((entry as GlobalLeaderboardEntry).totalCorrectWords || 0).toLocaleString()}</span>
            <span className="flex items-center gap-1"><span className="text-yellow-400">🍯</span>{((entry as GlobalLeaderboardEntry).lifetimeNectar || 0).toLocaleString()}</span>
            <span className="flex items-center gap-1"><span className="text-orange-400">🔥</span>{((entry as GlobalLeaderboardEntry).maxStreak || 0).toLocaleString()}</span>
          </div>
        );
      case 'friends':
        return (
          <div className="hidden items-center gap-4 text-sm text-text-muted md:flex">
            <span className="flex items-center gap-1"><span className="text-amber-400">★</span>{((entry as FriendsLeaderboardEntry).gamesWon || 0).toLocaleString()}</span>
            <span className="flex items-center gap-1"><span className="text-emerald-400">✓</span>{((entry as FriendsLeaderboardEntry).totalCorrectWords || 0).toLocaleString()}</span>
          </div>
        );
      case 'daily':
        return (
          <div className="hidden items-center gap-4 text-sm text-text-muted md:flex">
            <span className="flex items-center gap-1"><span className="text-amber-400">★</span>{(entry as DailyLeaderboardEntry).dailyWins}</span>
            <span className="flex items-center gap-1"><span className="text-emerald-400">✓</span>{(entry as DailyLeaderboardEntry).dailyCorrectWords}</span>
            <span className="flex items-center gap-1"><span className="text-yellow-400">✨</span>{(entry as DailyLeaderboardEntry).dailyXp.toLocaleString()} XP</span>
          </div>
        );
      case 'mode':
        return (
          <div className="hidden items-center gap-4 text-sm text-text-muted md:flex">
            <span className="flex items-center gap-1"><span className="text-amber-400">★</span>{(entry as ModeLeaderboardEntry).gamesWon}</span>
            <span className="flex items-center gap-1"><span className="text-emerald-400">✓</span>{(entry as ModeLeaderboardEntry).totalCorrectWords}</span>
            <span className="flex items-center gap-1"><span className="text-cyan-400">⚡</span>{formatWpm((entry as ModeLeaderboardEntry).bestWpm)}</span>
            <span className="flex items-center gap-1"><span className="text-orange-400">🔥</span>{(entry as ModeLeaderboardEntry).maxStreak}</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`relative flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200 ${
        isCurrentUser
          ? 'border-primary/60 bg-primary/10 ring-1 ring-primary/30'
          : 'border-surface bg-panel/40 hover:border-primary/40'
      }`}
    >
      {/* Rank */}
      <div className="w-12 flex-shrink-0 text-center">
        <span className="font-mono text-lg font-bold text-text-muted">#{rank}</span>
      </div>

      {/* Avatar & Name */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <LeaderboardAvatar
          username={entry.username}
          avatarUrl={entry.avatarUrl}
          tier={entry.tier}
          size={44}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-text-main">{entry.username}</span>
            {isCurrentUser && (
              <span className="rounded-full border border-primary/30 bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                You
              </span>
            )}
          </div>
          <TierBadge tier={entry.tier} size="sm" />
        </div>
      </div>

      {/* Stats */}
      <div className="hidden w-56 text-right lg:block">{getStatsDisplay()}</div>

      {/* Score */}
      <div className="w-28 flex-shrink-0 text-right">
        <span className="font-mono text-lg font-bold" style={{ color: tierColor }}>
          {formatScore(entryScore(entry))}
        </span>
      </div>
    </div>
  );
};

// ============================================================
// Leaderboard List — trophy podium (top 3) + ranked rows (4+)
// ============================================================

interface LeaderboardListProps {
  entries: LeaderboardEntry[];
  highlightedUserId?: string;
}

export const LeaderboardList: React.FC<LeaderboardListProps> = ({ entries, highlightedUserId }) => {
  const disableAnimations = useDisableAnimations();
  const rowsRef = useRef<HTMLDivElement>(null);

  // Podium only appears when the top ranks are on-screen (page 0). On later
  // pages entries start at rank 26+, so isTopThree is false and everything falls
  // through to the ranked list.
  const podium = entries.filter((e) => isTopThree(e.rank)).sort((a, b) => a.rank - b.rank).slice(0, 3);
  const rest = entries.filter((e) => !isTopThree(e.rank));

  // Rows stagger in when the dataset changes (initial load, tab switch, page).
  // Keyed on the first rest-row so it re-runs per page.
  useGSAP(
    () => {
      if (disableAnimations || !rowsRef.current) return;
      gsap.from(Array.from(rowsRef.current.children), {
        opacity: 0,
        y: 12,
        duration: 0.3,
        stagger: 0.03,
        ease: "power2.out",
        clearProps: "transform,opacity",
      });
    },
    { dependencies: [rest[0]?.userId, disableAnimations], scope: rowsRef },
  );

  return (
    <div className="space-y-6">
      {podium.length > 0 && (
        <LeaderboardPodium
          entries={podium}
          highlightedUserId={highlightedUserId}
          disableAnimations={disableAnimations}
        />
      )}
      {rest.length > 0 && (
        <div ref={rowsRef} className="space-y-2">
          {rest.map((entry, index) => (
            <LeaderboardRow
              key={entry.userId}
              entry={entry}
              index={index}
              highlightCurrentUser={!!highlightedUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// Pinned Rank Bar — the viewer's own rank, floated to the viewport bottom
// ============================================================

interface PinnedRankBarProps {
  rank: number;
  totalPlayers: number;
  score: number;
  label: string;
  username: string;
  avatarUrl: string | null;
}

export const PinnedRankBar: React.FC<PinnedRankBarProps> = ({
  rank,
  totalPlayers,
  score,
  label,
  username,
  avatarUrl,
}) => {
  const disableAnimations = useDisableAnimations();
  const rootRef = useRef<HTMLDivElement>(null);
  const tier = getTierFromScore(score);
  const tierColor = getTierColor(tier);
  const pct = totalPlayers > 0 ? Math.max(1, Math.round((rank / totalPlayers) * 100)) : null;

  useGSAP(
    () => {
      if (disableAnimations || !rootRef.current) return;
      gsap.from(rootRef.current, { y: 80, opacity: 0, duration: 0.4, ease: "power3.out" });
    },
    { dependencies: [disableAnimations, label], scope: rootRef },
  );

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div
        ref={rootRef}
        className="pointer-events-auto flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-[var(--theme-border-strong)] bg-panel/80 px-4 py-3 backdrop-blur-xl"
        style={{ boxShadow: "var(--theme-shadow-glow)" }}
      >
        <LeaderboardAvatar username={username} avatarUrl={avatarUrl} tier={tier} size={40} />
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Your {label} Rank
          </span>
          <div className="truncate text-sm font-bold text-text-main">{username}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg font-black" style={{ color: tierColor }}>
            {formatRank(rank)}
          </div>
          {pct !== null && (
            <div className="text-[10px] text-text-muted">
              Top {pct}% · {formatScore(score)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Leaderboard Tabs — weighted segmented control
// ============================================================

interface LeaderboardTabsProps {
  activeTab: LeaderboardType;
  onTabChange: (tab: LeaderboardType) => void;
  userId: string | null;
}

export const LeaderboardTabs: React.FC<LeaderboardTabsProps> = ({
  activeTab,
  onTabChange,
  userId,
}) => {
  return (
    <div
      className="flex items-center gap-2 overflow-x-auto px-4 py-3 custom-scrollbar"
      role="tablist"
      aria-label="Leaderboard categories"
    >
      {LEADERBOARD_TABS.filter((tab) => !(tab.requiresAuth && !userId)).map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            onClick={() => onTabChange(tab.id)}
            className={`group relative flex flex-shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
              active
                ? 'bg-primary text-app shadow-lg scale-[1.03]'
                : 'border border-surface bg-panel/40 text-text-muted hover:border-primary/50 hover:text-primary'
            }`}
            style={active ? { boxShadow: "var(--theme-shadow-glow)" } : undefined}
          >
            <span
              className={`grid h-6 w-6 place-items-center rounded-lg text-base ${
                active ? 'bg-app/20' : 'bg-black/10 group-hover:bg-primary/10'
              }`}
              aria-hidden="true"
            >
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </button>
        );
      })}
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
      {GAME_MODES.map((mode) => {
        const active = currentMode === mode;
        return (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all duration-200 ${
              active
                ? 'bg-primary text-app shadow-lg scale-[1.03]'
                : 'border border-surface bg-panel/40 text-text-muted hover:border-primary/50 hover:text-primary'
            }`}
            style={active ? { boxShadow: "var(--theme-shadow-glow)" } : undefined}
            role="radio"
            aria-checked={active}
          >
            {getModeLabel(mode)}
          </button>
        );
      })}
    </div>
  );
};
