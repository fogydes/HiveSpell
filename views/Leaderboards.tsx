import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useLeaderboards } from "../hooks/useLeaderboards";
import {
  LeaderboardTabs,
  ModeSelector,
  LeaderboardList,
  PinnedRankBar,
} from "../components/leaderboards/LeaderboardComponents";
import { SceneCanvasLayer } from "../components/scene";
import {
  LeaderboardType,
  GameMode,
  LEADERBOARD_TABS,
  getModeLabel,
} from "../utils/leaderboards";

const LeaderboardsView: React.FC = () => {
  const { user, userData } = useAuth();
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
    fetchPlayerRanks,
  } = useLeaderboards(user?.uid || null);

  const [activeTab, setActiveTab] = useState<LeaderboardType>("global");

  // Select the leaderboard data for the active tab (trivial O(1) selection)
  const currentLeaderboard =
    activeTab === "friends"
      ? friendsLeaderboard
      : activeTab === "daily"
        ? dailyLeaderboard
        : activeTab === "mode"
          ? modeLeaderboard
          : globalLeaderboard;

  // Stable refresh fn for the active tab — used as an effect dependency below.
  const refreshCurrent = useCallback(() => {
    switch (activeTab) {
      case "friends":
        return refreshFriends(true);
      case "daily":
        return refreshDaily(true);
      case "mode":
        return currentMode ? refreshMode(currentMode, true) : undefined;
      default:
        return refreshGlobal(true);
    }
  }, [activeTab, refreshGlobal, refreshFriends, refreshDaily, refreshMode, currentMode]);

  // Select the load-more fn for the active tab
  const loadMoreCurrent =
    activeTab === "friends"
      ? loadMoreFriends
      : activeTab === "daily"
        ? loadMoreDaily
        : activeTab === "mode"
          ? loadMoreMode
          : loadMoreGlobal;

  // Select the page number for the active tab
  const currentPage =
    activeTab === "friends"
      ? friendsPage
      : activeTab === "daily"
        ? dailyPage
        : activeTab === "mode"
          ? modePage
          : globalPage;

  // Resolve the viewer's own rank for the active board — feeds the pinned bottom
  // bar. Prefer the authoritative get_player_rank snapshot (works even when the
  // viewer is off the loaded page); fall back to their row if it's on-screen.
  const myRankInfo = useMemo(() => {
    if (!user) return null;
    const match = playerRanks.find(
      (r) =>
        r.leaderboardType === activeTab &&
        (activeTab !== "mode" || r.metadata?.mode === currentMode),
    );
    if (match && match.rank > 0) {
      return { rank: match.rank, totalPlayers: match.totalPlayers, score: match.score };
    }
    const entry = currentLeaderboard?.entries.find((e) => e.isCurrentUser);
    if (entry) {
      const score =
        entry.type === "global" || entry.type === "friends"
          ? entry.compositeScore
          : entry.type === "daily"
            ? entry.dailyXp
            : entry.modeScore;
      return { rank: entry.rank, totalPlayers: currentLeaderboard?.totalEntries ?? 0, score };
    }
    return null;
  }, [user, playerRanks, activeTab, currentMode, currentLeaderboard]);

  const myRankLabel =
    activeTab === "mode" && currentMode
      ? getModeLabel(currentMode)
      : LEADERBOARD_TABS.find((t) => t.id === activeTab)?.label ?? "Global";

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

  return (
    <div
      className={`theme-scene min-h-screen bg-app p-4 ${
        user && userData && myRankInfo ? "pb-28" : ""
      }`}
    >
      <SceneCanvasLayer />
      <div className="theme-panel-shell relative z-10 w-full max-w-7xl mx-auto rounded-[2rem] border bg-panel/35 backdrop-blur-xl overflow-hidden">
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
          />
        </div>

        {/* Mode Selector for "By Mode" tab */}
        {activeTab === "mode" && (
          <div className="border-b border-surface bg-panel/10 p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-text-muted">Game Mode:</span>
              <ModeSelector currentMode={currentMode || "baby"} onModeChange={handleModeChange} />
            </div>
          </div>
        )}

        {/* Leaderboard content */}
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
              <LeaderboardList
                entries={currentLeaderboard.entries}
                highlightedUserId={user?.uid}
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

      {/* Your rank, pinned to the viewport bottom (directive #4). Sourced from
          the real get_player_rank snapshot for the active board. */}
      {user && userData && myRankInfo && (
        <PinnedRankBar
          rank={myRankInfo.rank}
          totalPlayers={myRankInfo.totalPlayers}
          score={myRankInfo.score}
          label={myRankLabel}
          username={userData.username}
          avatarUrl={userData.avatarUrl ?? null}
        />
      )}
    </div>
  );
};

export default LeaderboardsView;