import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useCompetitiveIntegrity, RankedRating, RankedLeaderboardEntry } from "@/hooks/useCompetitiveIntegrity";
import { useSettings } from "@/context/SettingsContext";
import { supabase } from "@/services/supabase";
import {
  Trophy,
  ArrowUp,
  ArrowDown,
  Minus,
  Star,
  Crown,
  Award,
  Medal,
  Users,
  Clock,
  Target,
  TrendingUp,
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Info,
  HelpCircle,
  ExternalLink,
  Copy,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

// Mode configuration for ranked
const RANKED_MODES = [
  { id: "medium", name: "Medium", description: "Balanced challenge", minRating: 1400 },
  { id: "hard", name: "Hard", description: "Difficult words", minRating: 1500 },
  { id: "genius", name: "Genius", description: "Expert vocabulary", minRating: 1600 },
  { id: "competitive", name: "Competitive", description: "Tournament rules", minRating: 1700 },
];

const TIER_CONFIG: Record<string, { name: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  "Queen Bee": { name: "Queen Bee", color: "text-amber-400", bgColor: "bg-amber-400/20", icon: <Crown className="w-5 h-5" /> },
  "Hive Master": { name: "Hive Master", color: "text-yellow-400", bgColor: "bg-yellow-400/20", icon: <Star className="w-5 h-5" /> },
  "Hive Champion": { name: "Hive Champion", color: "text-orange-400", bgColor: "bg-orange-400/20", icon: <Award className="w-5 h-5" /> },
  "Busy Bee": { name: "Busy Bee", color: "text-emerald-400", bgColor: "bg-emerald-400/20", icon: <Medal className="w-5 h-5" /> },
  "Newbee": { name: "Newbee", color: "text-slate-400", bgColor: "bg-slate-400/20", icon: <Target className="w-5 h-5" /> },
  "Unranked (Placement)": { name: "Unranked (Placement)", color: "text-purple-400", bgColor: "bg-purple-400/20", icon: <Shield className="w-5 h-5" /> },
};

const Ranked: React.FC = () => {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { theme } = useSettings();
  const {
    getRankedRating,
    getRankedLeaderboard,
    getActiveSeason,
    getTierFromRating,
    getTierColor,
    loading,
    error,
  } = useCompetitiveIntegrity();

  const [activeTab, setActiveTab] = useState<"overview" | "leaderboard" | "matches" | "info">("overview");
  const [selectedMode, setSelectedMode] = useState("competitive");
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [userRatings, setUserRatings] = useState<RankedRating[]>([]);
  const [leaderboard, setLeaderboard] = useState<RankedLeaderboardEntry[]>([]);
  const [leaderboardPage, setLeaderboardPage] = useState(0);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [hasMoreLeaderboard, setHasMoreLeaderboard] = useState(true);
  const [activeSeason, setActiveSeason] = useState<{ id: string; name: string; end_date: string } | null>(null);

  // Load active season on mount
  useEffect(() => {
    const loadSeason = async () => {
      const season = await getActiveSeason();
      if (season) {
        setSeasonId(season);
        // Fetch season details
        const { data } = await supabase
          .from("seasons")
          .select("id, name, end_date")
          .eq("id", season)
          .single();
        if (data) setActiveSeason(data);
      }
    };
    loadSeason();
  }, [getActiveSeason]);

  // Load user ratings when season/mode changes
  useEffect(() => {
    if (user && seasonId) {
      const loadRatings = async () => {
        const ratings = await getRankedRating(user.uid, seasonId!);
        setUserRatings(ratings);
      };
      loadRatings();
    }
  }, [user, seasonId, getRankedRating]);

  // Load leaderboard when mode/page changes
  useEffect(() => {
    if (seasonId) {
      const loadLeaderboard = async () => {
        setLeaderboardLoading(true);
        const data = await getRankedLeaderboard(selectedMode, seasonId!, 50, leaderboardPage * 50);
        setLeaderboard(prev => leaderboardPage === 0 ? data : [...prev, ...data]);
        setHasMoreLeaderboard(data.length === 50);
        setLeaderboardLoading(false);
      };
      loadLeaderboard();
    }
  }, [selectedMode, seasonId, leaderboardPage, getRankedLeaderboard]);

  const loadMoreLeaderboard = () => {
    if (!leaderboardLoading && hasMoreLeaderboard) {
      setLeaderboardPage(p => p + 1);
    }
  };

  const refreshLeaderboard = () => {
    setLeaderboardPage(0);
    setHasMoreLeaderboard(true);
  };

  const handlePlayRanked = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    // Check if user has placement matches remaining for this mode
    const modeRating = userRatings.find(r => r.mode === selectedMode && r.season_id === seasonId);
    if (modeRating && modeRating.placement_matches_remaining > 0) {
      // Has placement matches - can play
    }
    navigate(`/play/${selectedMode}?ranked=true`);
  };

  const getCurrentModeRating = () => {
    return userRatings.find(r => r.mode === selectedMode && r.season_id === seasonId);
  };

  const formatRatingChange = (change: number) => {
    if (change > 0) return `+${change}`;
    if (change < 0) return `${change}`;
    return "0";
  };

  if (!user) {
    return (
      <div className="theme-scene min-h-screen bg-app flex items-center justify-center p-4">
        <div className="theme-panel-shell text-center p-8 max-w-md">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold text-text-main mb-2">Ranked Mode</h2>
          <p className="text-text-muted mb-6">
            Log in to compete in ranked matches, climb the leaderboard, and earn seasonal rewards!
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="rounded-full bg-primary text-app px-8 py-3 font-semibold transition-colors hover:opacity-90"
          >
            Log In to Play Ranked
          </button>
        </div>
      </div>
    );
  }

  const currentRating = getCurrentModeRating();
  const tierInfo = currentRating ? TIER_CONFIG[currentRating.tier] : TIER_CONFIG["Newbee"];

  return (
    <div className={`theme-scene min-h-screen bg-app transition-colors duration-1000 ${theme}`}>
      {/* Page Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-app/95 to-app/0 backdrop-blur-sm py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-text-main">Ranked Mode</h1>
              <p className="text-text-muted mt-1">
                {activeSeason ? `Season: ${activeSeason.name}` : "Loading season..."}
                {activeSeason && (
                  <span className="ml-3 px-2 py-0.5 text-xs bg-primary/20 text-primary rounded">
                    Ends {new Date(activeSeason.end_date).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedMode}
                onChange={(e) => {
                  setSelectedMode(e.target.value);
                  setLeaderboardPage(0);
                  setHasMoreLeaderboard(true);
                }}
                className="theme-panel-shell px-4 py-2 rounded-lg border bg-panel/50 text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {RANKED_MODES.map(mode => (
                  <option key={mode.id} value={mode.id}>
                    {mode.name} - {mode.description}
                  </option>
                ))}
              </select>
              <button
                onClick={handlePlayRanked}
                className="rounded-full bg-primary text-app px-6 py-3 font-semibold transition-colors hover:opacity-90 flex items-center gap-2"
                disabled={loading}
              >
                <Target className="w-5 h-5" />
                Play Ranked
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="fixed top-24 left-0 right-0 z-30 bg-app/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto">
          <nav className="flex gap-1 px-4 py-2 overflow-x-auto" role="tablist">
            {([
              { id: "overview", label: "Overview", icon: <Trophy className="w-4 h-4" /> },
              { id: "leaderboard", label: "Leaderboard", icon: <Users className="w-4 h-4" /> },
              { id: "matches", label: "Match History", icon: <Clock className="w-4 h-4" /> },
              { id: "info", label: "How It Works", icon: <HelpCircle className="w-4 h-4" /> },
            ] as const).map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-primary/20 text-primary border-b-2 border-primary"
                    : "text-text-muted hover:text-text-main hover:bg-surface"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="pt-40 pb-8 px-4">
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
              <button onClick={() => {}} className="ml-auto px-3 py-1 border border-red-500/30 rounded hover:bg-red-500/10 text-sm">
                Dismiss
              </button>
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-fade-in">
              {/* Current Rating Card */}
              <div className="theme-panel-shell rounded-2xl border bg-panel/50 p-6 backdrop-blur-xl">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className={`w-24 h-24 rounded-2xl flex items-center justify-center ${tierInfo.bgColor} ${tierInfo.color} border-2 border-current`}>
                      {tierInfo.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-text-main">{tierInfo.name}</h2>
                        {currentRating && currentRating.placement_matches_remaining > 0 && (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-400">
                            {currentRating.placement_matches_remaining} Placement Matches Left
                          </span>
                        )}
                      </div>
                      <p className="text-text-muted mt-1">
                        {selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)} Mode
                        {currentRating && ` • ${currentRating.games_played} games • ${currentRating.wins}W / ${currentRating.losses}L`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end lg:items-end gap-2 text-right">
                    <div className="text-4xl font-bold text-text-main font-mono">
                      {currentRating ? Math.round(currentRating.rating) : "—"}
                    </div>
                    <div className="text-sm text-text-muted">
                      Rating Deviation: ±{currentRating ? Math.round(currentRating.rd) : "—"}
                    </div>
                    <div className="text-xs text-text-muted">
                      Volatility: {currentRating ? currentRating.volatility.toFixed(3) : "—"}
                    </div>
                  </div>
                </div>

                {/* Progress Bar for next tier */}
                {currentRating && currentRating.placement_matches_remaining === 0 && (
                  <div className="mt-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-text-muted">Current Tier</span>
                      <span className="text-text-muted">Next Tier</span>
                    </div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, (currentRating.rating - 1400) / 8))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-text-muted mt-1">
                      <span>1400</span>
                      <span>1600</span>
                      <span>1800</span>
                      <span>2000</span>
                      <span>2200+</span>
                    </div>
                  </div>
                )}
              </div>

              {/* All Modes Summary */}
              <div className="theme-panel-shell rounded-2xl border bg-panel/50 p-6 backdrop-blur-xl">
                <h3 className="text-lg font-semibold text-text-main mb-4">All Mode Ratings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {RANKED_MODES.map(mode => {
                    const rating = userRatings.find(r => r.mode === mode.id && r.season_id === seasonId);
                    const modeTierInfo = rating ? TIER_CONFIG[rating.tier] : TIER_CONFIG["Newbee"];
                    const isSelected = selectedMode === mode.id;

                    return (
                      <button
                        key={mode.id}
                        onClick={() => setSelectedMode(mode.id)}
                        className={`theme-panel-shell rounded-xl border p-4 transition-all relative overflow-hidden ${
                          isSelected
                            ? "border-primary/50 bg-primary/5 ring-2 ring-primary/20"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-0 right-0 w-6 h-6 bg-primary/20 rounded-bl-xl flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${modeTierInfo.bgColor} ${modeTierInfo.color}`}>
                            {modeTierInfo.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-text-main truncate">{mode.name}</h4>
                            <p className="text-xs text-text-muted truncate">{mode.description}</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-text-main font-mono">
                              {rating ? Math.round(rating.rating) : "—"}
                            </span>
                            <span className="text-sm text-text-muted">±{rating ? Math.round(rating.rd) : "—"}</span>
                          </div>
                          {rating && rating.placement_matches_remaining > 0 && (
                            <p className="text-xs text-purple-400 mt-1">
                              {rating.placement_matches_remaining} placement matches remaining
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Season Rewards Preview */}
              {activeSeason && (
                <div className="theme-panel-shell rounded-2xl border bg-panel/50 p-6 backdrop-blur-xl">
                  <h3 className="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-400" />
                    Season Rewards
                  </h3>
                  <p className="text-text-muted mb-4">
                    Finish the season in a tier to earn exclusive rewards. Rewards are based on your highest rating achieved across all modes.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {[
                      { tier: "Queen Bee", minRating: 2200, rewards: "5,000 Nectar + Golden Crown Cursor" },
                      { tier: "Hive Master", minRating: 2000, rewards: "3,000 Nectar + Silver Wings Trail" },
                      { tier: "Hive Champion", minRating: 1800, rewards: "1,500 Nectar + Honey Glow Badge" },
                      { tier: "Busy Bee", minRating: 1600, rewards: "500 Nectar + Pollen Particles" },
                      { tier: "Newbee", minRating: 0, rewards: "100 Nectar" },
                    ].map((reward, i) => {
                      const info = TIER_CONFIG[reward.tier];
                      const achieved = currentRating && currentRating.rating >= reward.minRating && currentRating.placement_matches_remaining === 0;

                      return (
                        <div
                          key={reward.tier}
                          className={`theme-panel-shell rounded-xl border p-4 text-center transition-all ${
                            achieved ? "border-primary/50 bg-primary/5 ring-2 ring-primary/20" : "border-border opacity-70"
                          }`}
                        >
                          <div className={`w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center ${info.bgColor} ${info.color}`}>
                            {info.icon}
                          </div>
                          <h4 className="font-semibold text-text-main">{reward.tier}</h4>
                          <p className="text-xs text-text-muted mb-2">≥ {reward.minRating.toLocaleString()}</p>
                          <p className="text-sm text-text-muted">{reward.rewards}</p>
                          {achieved && (
                            <div className="mt-2 text-xs text-primary flex items-center justify-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Earned!
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === "leaderboard" && (
            <div className="space-y-6 animate-fade-in">
              {/* Player Rank Summary */}
              {currentRating && currentRating.placement_matches_remaining === 0 && (
                <div className="theme-panel-shell rounded-2xl border bg-panel/50 p-6 backdrop-blur-xl">
                  <h3 className="text-lg font-semibold text-text-main mb-4">Your Rank</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="theme-panel-shell rounded-xl border p-4 text-center">
                      <div className="text-3xl font-bold text-primary font-mono">#{/* Would need RPC for global rank */}—</div>
                      <div className="text-sm text-text-muted">Global Rank</div>
                    </div>
                    <div className="theme-panel-shell rounded-xl border p-4 text-center">
                      <div className="text-3xl font-bold text-text-main font-mono">
                        {Math.round(currentRating.rating).toLocaleString()}
                      </div>
                      <div className="text-sm text-text-muted">Current Rating</div>
                    </div>
                    <div className="theme-panel-shell rounded-xl border p-4 text-center">
                      <div className="text-3xl font-bold text-emerald-400 font-mono">
                        {(currentRating.wins / Math.max(1, currentRating.games_played) * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-text-muted">Win Rate</div>
                    </div>
                    <div className="theme-panel-shell rounded-xl border p-4 text-center">
                      <div className="text-3xl font-bold text-text-main font-mono">{currentRating.games_played}</div>
                      <div className="text-sm text-text-muted">Games Played</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Leaderboard Table */}
              <div className="theme-panel-shell rounded-2xl border bg-panel/50 p-6 backdrop-blur-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <h3 className="text-lg font-semibold text-text-main">
                    {selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)} Leaderboard
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={refreshLeaderboard}
                      disabled={leaderboardLoading}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-surface border border-border rounded-lg hover:bg-surface/80 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${leaderboardLoading ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-text-muted">
                        <th className="text-left py-3 px-4 font-medium">Rank</th>
                        <th className="text-left py-3 px-4 font-medium">Player</th>
                        <th className="text-left py-3 px-4 font-medium">Tier</th>
                        <th className="text-right py-3 px-4 font-medium">Rating</th>
                        <th className="text-right py-3 px-4 font-medium">RD</th>
                        <th className="text-right py-3 px-4 font-medium">W/L</th>
                        <th className="text-right py-3 px-4 font-medium">Win%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-text-muted">
                            {leaderboardLoading ? "Loading leaderboard..." : "No ranked players yet"}
                          </td>
                        </tr>
                      ) : (
                        leaderboard.map((entry, index) => (
                          <tr
                            key={entry.user_id}
                            className={`border-b border-border/50 hover:bg-surface/50 transition-colors ${
                              entry.user_id === user.uid ? "bg-primary/5" : ""
                            }`}
                          >
                            <td className="py-3 px-4 font-mono font-medium text-text-main">
                              {leaderboardPage * 50 + index + 1}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {entry.avatar_url ? (
                                  <img src={entry.avatar_url} alt={entry.username} className="w-8 h-8 rounded-full" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                    {entry.username.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <span className="font-medium text-text-main">{entry.username}</span>
                                  {entry.user_id === user.uid && (
                                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded">You</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getTierColor(entry.tier)}`}>
                                {entry.tier}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-medium text-text-main">
                              {Math.round(entry.rating).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right text-text-muted font-mono">
                              ±{Math.round(entry.rd)}
                            </td>
                            <td className="py-3 px-4 text-right text-text-muted font-mono">
                              {entry.wins} / {entry.losses}
                            </td>
                            <td className="py-3 px-4 text-right font-medium">
                              {(entry.win_rate * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Load More */}
                {hasMoreLeaderboard && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={loadMoreLeaderboard}
                      disabled={leaderboardLoading}
                      className="px-6 py-3 bg-surface border border-border rounded-xl font-medium text-text-main hover:bg-surface/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
                    >
                      {leaderboardLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Load More
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Matches Tab */}
          {activeTab === "matches" && (
            <div className="animate-fade-in">
              <div className="theme-panel-shell rounded-2xl border bg-panel/50 p-6 backdrop-blur-xl">
                <h3 className="text-lg font-semibold text-text-main mb-4">Match History</h3>
                <p className="text-text-muted mb-6">
                  Match history will be displayed here after you play ranked matches.
                  <br />
                  Each match shows rating changes, opponents, and performance stats.
                </p>
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-text-muted/50" />
                  <p className="text-text-muted">No matches played yet</p>
                  <button
                    onClick={handlePlayRanked}
                    className="mt-4 px-6 py-2 bg-primary text-app rounded-xl font-semibold hover:opacity-90"
                  >
                    Play Your First Ranked Match
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Info Tab */}
          {activeTab === "info" && (
            <div className="space-y-6 animate-fade-in">
              <div className="theme-panel-shell rounded-2xl border bg-panel/50 p-6 backdrop-blur-xl">
                <h3 className="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary" />
                  How Ranked Works
                </h3>
                <div className="space-y-4 text-text-muted">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary">
                      <span className="font-bold">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-text-main">Placement Matches</h4>
                      <p>Play 10 placement matches to establish your initial rating. Your rating will fluctuate more during placement.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary">
                      <span className="font-bold">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-text-main">Glicko-2 Rating System</h4>
                      <p>We use the Glicko-2 system (used by Chess.com, Lichess) which tracks Rating, Rating Deviation (RD), and Volatility. RD represents uncertainty - it decreases with more games and increases with inactivity.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary">
                      <span className="font-bold">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-text-main">Rating Tiers</h4>
                      <p>Queen Bee (2200+) → Hive Master (2000+) → Hive Champion (1800+) → Busy Bee (1600+) → Newbee (below 1600)</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary">
                      <span className="font-bold">4</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-text-main">Seasonal Decay</h4>
                      <p>Rating Deviation increases by 0.5/day of inactivity above 1500 rating. This doesn't lower your rating, but makes rating changes larger when you return.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary">
                      <span className="font-bold">5</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-text-main">Anti-Cheat & Replay Verification</h4>
                      <p>All ranked matches log keystroke timing data. Statistical analysis detects impossibly uniform intervals, superhuman WPM, and robotic patterns. Suspicious matches are flagged for review.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary">
                      <span className="font-bold">6</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-text-main">Season Rewards</h4>
                      <p>Earn exclusive cosmetics and Nectar based on your highest tier at season end. Rewards are distributed automatically when the season concludes.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="theme-panel-shell rounded-2xl border bg-panel/50 p-6 backdrop-blur-xl">
                <h3 className="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Competitive Integrity
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="theme-panel-shell rounded-xl border p-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h4 className="font-semibold text-text-main mb-1">Keystroke Logging</h4>
                    <p className="text-text-muted text-sm">Every keystroke in ranked is timestamped and sent to the server for verification.</p>
                  </div>
                  <div className="theme-panel-shell rounded-xl border p-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
                      <Search className="w-5 h-5 text-blue-400" />
                    </div>
                    <h4 className="font-semibold text-text-main mb-1">Statistical Analysis</h4>
                    <p className="text-text-muted text-sm">Inter-keystroke intervals analyzed for uniformity, speed, and human-like variance (CV 0.3-0.5).</p>
                  </div>
                  <div className="theme-panel-shell rounded-xl border p-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center mb-3">
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                    </div>
                    <h4 className="font-semibold text-text-main mb-1">Automated Flagging</h4>
                    <p className="text-text-muted text-sm">Matches with anomaly score ≥ 0.6 are flagged for moderator review. Repeated flags can result in seasonal disqualification.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Import supabase for season fetch */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // This is a placeholder - the actual supabase import is handled by the module system
          `
        }}
      />
    </div>
  );
};
export default Ranked;