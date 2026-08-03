import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMultiplayer } from "../context/MultiplayerContext";
import { useToast } from "../context/ToastContext";
import { TutorialOverlay } from "../components/TutorialOverlay";
import { ProfileCompletionOverlay } from "../components/ProfileCompletionOverlay";
import { useSessionState, getSegmentContent } from "../hooks/useSessionState";
import { useHaptics } from "../hooks/useHaptics";
import { useChallenges } from "../hooks/useChallenges";
import { TierBadge, TierBadgeMini, TierProgressBar } from "../components/tier/TierBadge";
import { ChallengeSummaryBar } from "../components/challenges/ChallengeCard";
import { getTierFromStats, getTierProgress, getNextTierName, formatTierDisplay, type PlayerStats } from "../utils/tierRanking";
import { navigateToBattlePass, navigateToChallenges } from "../utils/navigation";

const LAST_MODE_KEY = "hive_last_mode";

/** Call this from Play.tsx when a game starts to record the last difficulty. */
export const saveLastPlayedMode = (mode: string) => {
  localStorage.setItem(LAST_MODE_KEY, mode);
};

const Home: React.FC = () => {
  const { user, userData } = useAuth();
  const { joinPublicGame, loading } = useMultiplayer();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);

  const lastMode = localStorage.getItem(LAST_MODE_KEY);

  // Session-aware state
  const sessionState = useSessionState();
  const { vibrate } = useHaptics();
  const segmentContent = getSegmentContent(sessionState.segment);

  // Challenges data for summary bar
  const { completedDailyCount, totalDailyCount, completedWeeklyCount, totalWeeklyCount } = useChallenges(user?.uid || null);

  // Haptic patterns
  const lightImpact = () => vibrate("light");
  const mediumImpact = () => vibrate("medium");
  const successImpact = () => vibrate("success");

  // Track CTA clicks for haptics
  const handlePrimaryCTA = () => {
    mediumImpact();
    if (segmentContent.primaryCTA.href.startsWith("/play/")) {
      handleQuickPlay();
    } else {
      navigate(segmentContent.primaryCTA.href);
    }
  };

  const handleSecondaryCTA = () => {
    if (segmentContent.secondaryCTA) {
      lightImpact();
      navigate(segmentContent.secondaryCTA.href);
    }
  };

  // Compute tier from user stats
  const playerStats: PlayerStats = useMemo(() => {
    if (!userData) return { wins: 0, corrects: 0, lifetimeNectar: 0, gamesPlayed: sessionState.sessionCount };
    return {
      wins: userData.wins,
      corrects: userData.corrects,
      lifetimeNectar: userData.lifetimeNectar,
      gamesPlayed: sessionState.sessionCount,
    };
  }, [userData, sessionState.sessionCount]);

  const tier = useMemo(() => getTierFromStats(playerStats), [playerStats]);
  const tierProgress = useMemo(() => getTierProgress(playerStats), [playerStats]);
  const nextTierName = useMemo(() => getNextTierName(playerStats), [playerStats]);

  const handleQuickPlay = async () => {
    if (!lastMode || loading || joining) return;
    setJoining(true);
    try {
      await joinPublicGame(lastMode);
      navigate(`/play/${lastMode}`);
    } catch {
      showToast({
        title: "Matchmaking failed",
        message: "Could not find a match. Try the lobby.",
        variant: "error",
      });
    } finally {
      setJoining(false);
    }
  };

  // Show streak reward toast on new day
  useEffect(() => {
    if (sessionState.isNewDay && sessionState.streakReward && userData) {
      const { nectar, multiplier } = sessionState.streakReward;
      showToast({
        title: `🔥 Day ${sessionState.dailyStreak} Streak!`,
        message: `+${nectar} Nectar • ${multiplier}x multiplier active`,
        variant: "success",
        durationMs: 5000,
      });
      successImpact();
    }
  }, [sessionState.isNewDay, sessionState.streakReward, sessionState.dailyStreak, userData, showToast, successImpact]);

  // Show welcome back message as toast on return
  useEffect(() => {
    if (sessionState.welcomeBackMessage && userData && sessionState.daysSinceLastSession > 0) {
      showToast({
        title: "Welcome Back! 🐝",
        message: sessionState.welcomeBackMessage,
        variant: "info",
        durationMs: 6000,
      });
      lightImpact();
    }
  }, [sessionState.welcomeBackMessage, sessionState.daysSinceLastSession, userData, showToast, lightImpact]);

  return (
    <div className="theme-scene min-h-screen flex flex-col items-center justify-center bg-app p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div
          className="absolute -top-12 left-[10%] h-80 w-80 rounded-full blur-3xl opacity-80"
          style={{ backgroundImage: "var(--theme-ambient-glow)" }}
        ></div>
        <div
          className="absolute bottom-[-12%] right-[8%] h-72 w-72 rounded-full blur-3xl opacity-65"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--accent) 26%, transparent) 0%, transparent 72%)",
          }}
        ></div>
      </div>

      <div className="theme-panel-shell relative z-10 w-full max-w-4xl rounded-[2rem] border bg-panel/35 p-8 text-center backdrop-blur-xl md:p-14">
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--theme-border-strong)] bg-black/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.3em] text-text-muted">
          {segmentContent.badge || "Competitive Spelling Arena"}
        </div>

        <div className="flex flex-col items-center">
          <h1
            data-display="true"
            className="mb-4 text-5xl font-black leading-none text-text-main md:text-7xl"
          >
            Hive<span className="text-primary">Spell</span>
          </h1>

          {/* Segment-specific headline & subheadline */}
          <div className="max-w-2xl text-center mb-6">
            <h2 className="mb-2 text-2xl sm:text-3xl font-bold text-text-main">
              {segmentContent.headline}
            </h2>
            <p className="text-lg font-light leading-relaxed text-text-muted">
              {segmentContent.subheadline}
            </p>
          </div>
        </div>

        {/* Quick stats for logged-in users */}
        {user && userData && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {/* Tier Badge - prominently displayed */}
            <TierBadge
              tier={tier}
              size="lg"
              showProgress={true}
              progress={tierProgress}
              nextTierName={nextTierName}
              animate={true}
              className="animate-tier-pulse"
            />

            <div className="rounded-xl border border-surface bg-panel/50 px-4 py-3 text-center">
              <TierBadgeMini tier={tier} showIcon={true} />
              <div className="mt-1 text-[10px] uppercase tracking-wider text-text-muted">Tier</div>
              <TierProgressBar
                tier={tier}
                progress={tierProgress}
                nextTierName={nextTierName}
                showLabels={false}
                className="mt-2 max-w-xs"
              />
            </div>

            <div className="rounded-xl border border-surface bg-panel/50 px-4 py-3 text-center">
              <div className="text-2xl font-black text-primary">{userData.wins}</div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted">Wins</div>
            </div>
            <div className="rounded-xl border border-surface bg-panel/50 px-4 py-3 text-center">
              <div className="text-2xl font-black text-primary">{userData.corrects?.toLocaleString()}</div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted">Corrects</div>
            </div>
            <div className="rounded-xl border border-surface bg-panel/50 px-4 py-3 text-center">
              <div className="text-2xl font-black text-accent">{userData.title}</div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted">Title</div>
            </div>

            {/* Daily streak display */}
            {sessionState.dailyStreak > 0 && (
              <div className="rounded-xl border border-accent/50 bg-accent/10 px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2 text-2xl font-black text-accent">
                  <span>🔥</span>
                  <span>{sessionState.dailyStreak}</span>
                </div>
                <div className="text-[10px] uppercase tracking-wider text-accent/80">Day Streak</div>
              </div>
            )}

            {/* Session count badge */}
            {sessionState.sessionCount > 1 && (
              <div className="rounded-xl border border-primary/50 bg-primary/10 px-4 py-3 text-center">
                <div className="text-2xl font-black text-primary">{sessionState.sessionCount}</div>
                <div className="text-[10px] uppercase tracking-wider text-primary/80">Sessions</div>
              </div>
            )}

            {/* Challenge Summary Bar for logged-in users */}
            {user && (
              <ChallengeSummaryBar
                dailyCompleted={completedDailyCount}
                dailyTotal={totalDailyCount}
                weeklyCompleted={completedWeeklyCount}
                weeklyTotal={totalWeeklyCount}
                onClick={() => navigate("/challenges")}
              />
            )}
          </div>
        )}

        {/* Segment-specific CTA buttons */}
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <button
            onClick={handlePrimaryCTA}
            disabled={joining || loading}
            className="rounded-full bg-primary px-10 py-4 text-lg font-black tracking-[0.18em] text-app transition-all hover:scale-[var(--hover-scale)] disabled:opacity-50 disabled:cursor-wait"
            style={{ boxShadow: "var(--theme-shadow-glow)" }}
          >
            {joining ? "FINDING MATCH..." : segmentContent.primaryCTA.label}
          </button>

          {segmentContent.secondaryCTA && (
            <button
              onClick={handleSecondaryCTA}
              className="rounded-full border border-surface px-8 py-4 text-sm font-bold uppercase tracking-wider text-text-muted transition-colors hover:border-primary hover:text-primary"
            >
              {segmentContent.secondaryCTA.label}
            </button>
          )}

          {user && segmentContent.secondaryCTA && (
            <button
              onClick={() => navigate("/lobby")}
              className="rounded-full border border-surface px-8 py-4 text-sm font-bold uppercase tracking-wider text-text-muted transition-colors hover:border-primary hover:text-primary"
            >
              Browse Lobby
            </button>
          )}

          {/* Battle Pass button for logged-in users */}
          {user && (
            <button
              onClick={() => navigate("/battle-pass")}
              className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-4 text-sm font-bold uppercase tracking-wider text-app transition-all hover:opacity-90 hover:scale-105"
              style={{ boxShadow: "0 4px 14px 0 rgb(245 158 11 / 0.4)" }}
            >
              👑 Battle Pass
            </button>
          )}

          {/* Challenges button for logged-in users */}
          {user && (
            <button
              onClick={() => navigate("/challenges")}
              className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-4 text-sm font-bold uppercase tracking-wider text-app transition-all hover:opacity-90 hover:scale-105"
              style={{ boxShadow: "0 4px 14px 0 rgb(16 185 129 / 0.4)" }}
            >
              📋 Challenges
            </button>
          )}

          {/* Leaderboards button for logged-in users */}
          {user && (
            <button
              onClick={() => navigate("/leaderboards")}
              className="rounded-full bg-gradient-to-r from-purple-500 to-violet-500 px-8 py-4 text-sm font-bold uppercase tracking-wider text-app transition-all hover:opacity-90 hover:scale-105"
              style={{ boxShadow: "0 4px 14px 0 rgb(139 92 246 / 0.4)" }}
            >
              🏆 Leaderboards
            </button>
          )}
        </div>

        {!user && (
          <p className="mt-4 text-xs uppercase tracking-[0.22em] text-text-muted">
            Fast rounds. Tight pressure. Clean wins.
          </p>
        )}
      </div>

      {!user && (
        <div className="absolute bottom-8 text-sm text-text-muted">
          Already have an account?{" "}
          <button
            onClick={() => navigate("/auth")}
            className="ml-1 text-primary hover:underline"
          >
            Log in
          </button>
        </div>
      )}

      {/* Tutorial Overlay for new users */}
      <TutorialOverlay />

      {/* Profile Completion Overlay for new users */}
      <ProfileCompletionOverlay />
    </div>
  );
};

export default Home;