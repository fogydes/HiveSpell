import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useLeaderboards } from "../hooks/useLeaderboards";
import {
  LeaderboardTabs,
  ModeSelector,
  LeaderboardTable,
  PlayerRankSummary,
  TierBadge,
} from "../components/leaderboards/LeaderboardComponents";
import {
  LeaderboardType,
  GameMode,
  GAME_MODES,
  GAME_MODE_LABELS,
  LEADERBOARD_TABS,
  formatRank,
  formatScore,
  formatWpm,
  getRankEmoji,
} from "../utils/leaderboards";
import { useScene } from "@/context/SceneContext";
import { useReduceMotion } from "@/hooks/useAccessibility";

const LeaderboardsView: React.FC = () => {
  const { user } = useAuth();
  const { performanceTier } = useScene();
  const reduceMotion = useReduceMotion();
  const disableAnimations = performanceTier === "static" || reduceMotion;
  const {
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
  } = useLeaderboards(user?.uid || null);

  const [activeTab, setActiveTab] = useState<LeaderboardType>("global");

  // Get the appropriate leaderboard data based on active tab
  const currentLeaderboard = useMemo(() => {
    switch (activeTab) {
      case "global":
        return globalLeaderboard;
      case "friends":
        return friendsLeaderboard;
      case "daily":
        return dailyLeaderboard;
      case "mode":
        return modeLeaderboard;
      default:
        return globalLeaderboard;
    }
  }, [activeTab, globalLeaderboard, friendsLeaderboard, dailyLeaderboard, modeLeaderboard]);

  // Get the appropriate refresh function
  const refreshCurrent = useMemo(() => {
    switch (activeTab) {
      case "global":
        return () => refreshGlobal(true);
      case "friends":
        return () => refreshFriends(true);
      case "daily":
        return () => refreshDaily(true);
      case "mode":
        return () => currentMode && refreshMode(currentMode, true);
      default:
        return () => refreshGlobal(true);
    }
  }, [activeTab, refreshGlobal, refreshFriends, refreshDaily, refreshMode, currentMode]);

  // Get the appropriate load more function
  const loadMoreCurrent = useMemo(() => {
    switch (activeTab) {
      case "global":
        return loadMoreGlobal;
      case "friends":
        return loadMoreFriends;
      case "daily":
        return loadMoreDaily;
      case "mode":
        return loadMoreMode;
      default:
        return loadMoreGlobal;
    }
  }, [activeTab, loadMoreGlobal, loadMoreFriends, loadMoreDaily, loadMoreMode]);

  // Get the appropriate page number
  const currentPage = useMemo(() => {
    switch (activeTab) {
      case "global":
        return globalPage;
      case "friends":
        return friendsPage;
      case "daily":
        return dailyPage;
      case "mode":
        return modePage;
      default:
        return globalPage;
    }
  }, [activeTab, globalPage, friendsPage, dailyPage, modePage]);

  // Fetch player ranks when user changes or on initial load
  useEffect(() => {
    if (user?.uid) {
      fetchPlayerRanks();
    }
  }, [user?.uid, fetchPlayerRanks]);

  // Refresh when tab changes
  useEffect(() => {
    refreshCurrent();
  }, [activeTab, refreshCurrent]);

  const handleRefresh = () => {
    refreshCurrent();
  };

  const handleLoadMore = () => {
    loadMoreCurrent();
  };

  const handleModeChange = (mode: GameMode) => {
    setCurrentMode(mode);
    refreshMode(mode, true);
  };

  const getLeaderboardColumns = (type: LeaderboardType) => {
    switch (type) {
      case "global":
        return [
          { key: "rank", label: "#", width: "60px", align: "center" as const },
          { key: "username", label: "Player", width: "auto", align: "left" as const },
          { key: "tier", label: "Tier", width: "100px", align: "center" as const },
          { key: "compositeScore", label: "Score", width: "100px", align: "center" as const },
          { key: "gamesWon", label: "Wins", width: "80px", align: "center" as const },
          { key: "totalCorrectWords", label: "Corrects", width: "100px", align: "center" as const },
          { key: "maxStreak", label: "Best Streak", width: "100px", align: "center" as const },
        ];
      case "friends":
        return [
          { key: "rank", label: "#", width: "60px", align: "center" as const },
          { key: "username", label: "Friend", width: "auto", align: "left" as const },
          { key: "tier", label: "Tier", width: "100px", align: "center" as const },
          { key: "compositeScore", label: "Score", width: "100px", align: "center" as const },
          { key: "gamesWon", label: "Wins", width: "80px", align: "center" as const },
          { key: "totalCorrectWords", label: "Corrects", width: "100px", align: "center" as const },
          { key: "maxStreak", label: "Best Streak", width: "100px", align: "center" as const },
        ];
      case "daily":
        return [
          { key: "rank", label: "#", width: "60px", align: "center" as const },
          { key: "username", label: "Player", width: "auto", align: "left" as const },
          { key: "tier", label: "Tier", width: "100px", align: "center" as const },
          { key: "dailyXp", label: "Daily XP", width: "100px", align: "center" as const },
          { key: "dailyWins", label: "Wins", width: "80px", align: "center" as const },
          { key: "dailyCorrectWords", label: "Corrects", width: "100px", align: "center" as const },
        ];
      case "mode":
        return [
          { key: "rank", label: "#", width: "60px", align: "center" as const },
          { key: "username", label: "Player", width: "auto", align: "left" as const },
          { key: "tier", label: "Tier", width: "100px", align: "center" as const },
          { key: "modeScore", label: "Score", width: "100px", align: "center" as const },
          { key: "gamesWon", label: "Wins", width: "80px", align: "center" as const },
          { key: "totalCorrectWords", label: "Corrects", width: "100px", align: "center" as const },
          { key: "bestWpm", label: "Best WPM", width: "100px", align: "center" as const },
          { key: "maxStreak", label: "Best Streak", width: "100px", align: "center" as const },
        ];
    }
  };

  const renderRow = (entry: any, index: number) => {
    const isCurrentUser = entry.isCurrentUser;
    const rankEmoji = getRankEmoji(entry.rank);
    const displayRank = rankEmoji || formatRank(entry.rank);

    if (activeTab === "global" || activeTab === "friends") {
      return (
        <tr
          key={entry.userId}
          className={`theme-row transition-colors ${isCurrentUser ? "bg-primary/10" : ""}`}
        >
          <td className="text-center font-mono text-xl">{displayRank}</td>
          <td className="flex items-center gap-3">
            {entry.avatarUrl && (
              <img
                src={entry.avatarUrl}
                alt=""
                className="w-8 h-8 rounded-full border border-surface"
              />
            )}
            <span
              className={`font-medium ${isCurrentUser ? "text-primary" : ""}`}
            >
              {entry.username}{isCurrentUser && " (You)"}
            </span>
          </td>
          <td className="text-center">
            <TierBadge tier={entry.tier} size="sm" />
          </td>
          <td className="text-center font-mono text-lg font-bold text-primary">
            {formatScore(entry.compositeScore)}
          </td>
          <td className="text-center font-mono">{entry.gamesWon}</td>
          <td className="text-center font-mono">{entry.totalCorrectWords.toLocaleString()}</td>
          <td className="text-center font-mono text-accent">{entry.maxStreak}</td>
        </tr>
      );
    }

    if (activeTab === "daily") {
      return (
        <tr
          key={entry.userId}
          className={`theme-row transition-colors ${isCurrentUser ? "bg-primary/10" : ""}`}
        >
          <td className="text-center font-mono text-xl">{displayRank}</td>
          <td className="flex items-center gap-3">
            {entry.avatarUrl && (
              <img
                src={entry.avatarUrl}
                alt=""
                className="w-8 h-8 rounded-full border border-surface"
              />
            )}
            <span
              className={`font-medium ${isCurrentUser ? "text-primary" : ""}`}
            >
              {entry.username}{isCurrentUser && " (You)"}
            </span>
          </td>
          <td className="text-center">
            <TierBadge tier={entry.tier} size="sm" />
          </td>
          <td className="text-center font-mono text-lg font-bold text-accent">
            {formatScore(entry.dailyXp)}
          </td>
          <td className="text-center font-mono">{entry.dailyWins}</td>
          <td className="text-center font-mono">{entry.dailyCorrectWords.toLocaleString()}</td>
        </tr>
      );
    }

    if (activeTab === "mode") {
      return (
        <tr
          key={entry.userId}
          className={`theme-row transition-colors ${isCurrentUser ? "bg-primary/10" : ""}`}
        >
          <td className="text-center font-mono text-xl">{displayRank}</td>
          <td className="flex items-center gap-3">
            {entry.avatarUrl && (
              <img
                src={entry.avatarUrl}
                alt=""
                className="w-8 h-8 rounded-full border border-surface"
              />
            )}
            <span
              className={`font-medium ${isCurrentUser ? "text-primary" : ""}`}
            >
              {entry.username}{isCurrentUser && " (You)"}
            </span>
          </td>
          <td className="text-center">
            <TierBadge tier={entry.tier} size="sm" />
          </td>
          <td className="text-center font-mono text-lg font-bold text-primary">
            {formatScore(entry.modeScore)}
          </td>
          <td className="text-center font-mono">{entry.gamesWon}</td>
          <td className="text-center font-mono">{entry.totalCorrectWords.toLocaleString()}</td>
          <td className="text-center font-mono text-secondary">{formatWpm(entry.bestWpm)}</td>
          <td className="text-center font-mono text-accent">{entry.maxStreak}</td>
        </tr>
      );
    }

    return null;
  };

  const tabConfigs = LEADERBOARD_TABS.filter((tab) => {
    if (!user && tab.requiresAuth) return false;
    return true;
  });

  return (
    <div className="theme-scene min-h-screen bg-app p-4">
      <div className="theme-panel-shell relative z-10 w-full max-w-7xl rounded-[2rem] border bg-panel/35 backdrop-blur-xl overflow-hidden">
        {/* Header */}
        <div className="border-b border-surface bg-panel/20 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-text-main">Leaderboards</h1>
              <p className="text-text-muted mt-1">
                Compete globally, with friends, daily, or by game mode
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 rounded-full border border-surface px-4 py-2 text-sm font-semibold text-text-muted transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            >
              <svg
                className={`w-4 h-4 transition-transform ${loading ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-surface bg-panel/10">
          <LeaderboardTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            userId={user?.uid || null}
            currentMode={currentMode}
            onModeChange={handleModeChange}
          />
        </div>

        {/* Mode Selector for "By Mode" tab */}
        {activeTab === "mode" && (
          <div className="border-b border-surface bg-panel/10 p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-text-muted">Game Mode:</span>
              <ModeSelector currentMode={currentMode || "medium"} onModeChange={handleModeChange} />
            </div>
          </div>
        )}

        {/* Player Rank Summary */}
        {playerRanks.length > 0 && (
          <div className="border-b border-surface bg-panel/10 p-4">
            <PlayerRankSummary ranks={playerRanks} onClick={() => {}} />
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="p-4 overflow-x-auto">
          {loading && (!currentLeaderboard || currentLeaderboard.entries.length === 0) ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"
                />
                <span className="text-text-muted">Loading leaderboard...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-error mb-2">Failed to load leaderboard</p>
                <p className="text-text-muted text-sm mb-4">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : !currentLeaderboard || currentLeaderboard.entries.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <svg
                  className="mx-auto w-12 h-12 text-text-muted mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <p className="text-text-muted">No entries yet</p>
                <p className="text-text-muted text-sm mt-1">
                  Play games to appear on the leaderboard!
                </p>
              </div>
            </div>
          ) : (
            <>
              <LeaderboardTable
                title={LEADERBOARD_TABS.find(t => t.id === activeTab)?.label || 'Leaderboard'}
                entries={currentLeaderboard.entries}
                loading={loading}
                error={error}
                emptyMessage="No entries yet"
                onLoadMore={handleLoadMore}
                hasMore={currentLeaderboard.hasNextPage}
              />
              {/* Pagination */}
              {currentLeaderboard.hasNextPage && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    onClick={handleLoadMore}
                    className="rounded-full border border-surface px-6 py-3 text-sm font-semibold text-text-main transition-colors hover:border-primary hover:text-primary"
                  >
                    Load More ({currentLeaderboard.entries.length} shown)
                  </button>
                  <span className="text-sm text-text-muted">
                    Page {currentPage + 1} of {currentLeaderboard.totalPages}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Info Footer */}
        <div className="border-t border-surface bg-panel/10 p-4 text-center">
          <p className="text-xs text-text-muted">
            Leaderboards refresh hourly. Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardsView;